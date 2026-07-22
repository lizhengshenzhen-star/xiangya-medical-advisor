#!/usr/bin/env python3
"""
从好大夫公开页采集湘雅 / 湘雅附二医生与近期排班，并基于科室、擅长、患者评价生成能力画像。

用法:
  python3 scripts/haodf_build_doctor_library.py
  python3 scripts/haodf_build_doctor_library.py --days 10 --skip-reviews
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "scripts" / "raw" / "haodf"
OUT_XY = ROOT / "src" / "data" / "doctor-library" / "campuses" / "xiangya.json"
OUT_XY2 = ROOT / "src" / "data" / "doctor-library" / "campuses" / "xiangya2.json"
OUT_MANIFEST = ROOT / "src" / "data" / "doctor-library" / "manifest.json"
OUT_SCHEDULE = ROOT / "src" / "data" / "schedules" / "recent.json"
SEED_XY = OUT_XY
SEED_XY2 = OUT_XY2

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
CTX = ssl.create_default_context()

HOSPITALS = {
    "xiangya": {
        "id": 499,
        "name": "中南大学湘雅医院",
        "haodfName": "湘雅医院",
    },
    "xiangya2": {
        "id": 535,
        "name": "中南大学湘雅二医院",
        "haodfName": "湘雅二医院",
    },
}

# 科室名 → (departmentCode, serviceRole, base capability tags)
DEPT_RULES: list[tuple[re.Pattern[str], str, str, list[str]]] = [
    (re.compile(r"心理咨询|医学心理|心理治疗"), "counseling_clinic", "counselor", ["psychological_counseling", "psychotherapy", "mental_health"]),
    (re.compile(r"临床心理"), "clinical_psychology", "clinical_psychologist", ["psychological_counseling", "psychotherapy", "mental_health"]),
    (re.compile(r"精神"), "psychiatry", "psychiatrist", ["mental_health", "psychiatry_medication", "depression_management"]),
    (re.compile(r"呼吸"), "respiratory", "physician", ["respiratory"]),
    (re.compile(r"胸外"), "thoracic", "physician", ["thoracic", "surgery_decision"]),
    (re.compile(r"心脏|心血管|心内|心外"), "cardiology", "physician", ["cardiology"]),
    (re.compile(r"消化|胃肠|肝胆"), "gastroenterology", "physician", ["gastroenterology"]),
    (re.compile(r"神经内"), "neurology", "physician", ["neurology"]),
    (re.compile(r"脊柱"), "spine", "physician", ["orthopedics", "surgery_decision"]),
    (re.compile(r"骨科|关节|创伤骨|运动医学"), "orthopedics", "physician", ["orthopedics"]),
    (re.compile(r"全科"), "general_practice", "physician", ["first_visit_support", "path_clarification"]),
]

SPECIALTY_RULES: list[tuple[re.Pattern[str], list[str]]] = [
    (re.compile(r"CBT|认知行为"), ["CBT", "psychotherapy", "psychological_counseling"]),
    (re.compile(r"ACT|接纳承诺"), ["ACT", "psychotherapy"]),
    (re.compile(r"心理咨询|会谈|心理治疗"), ["psychological_counseling", "psychotherapy"]),
    (re.compile(r"抑郁"), ["depression_management", "mental_health"]),
    (re.compile(r"微创|胸腔镜|腔镜"), ["minimally_invasive"]),
    (re.compile(r"手术"), ["surgery_decision"]),
    (re.compile(r"慢病|随访|长期"), ["chronic_management"]),
    (re.compile(r"疑难|复杂"), ["complex_evaluation"]),
]

REVIEW_POS = re.compile(r"耐心|讲解|细致|态度好|认真负责|沟通|解释清楚|温暖|温和|仔细|专业|有效")
REVIEW_FIRST = re.compile(r"第一次|初次|首诊|外地|远道|慕名|跑来")
REVIEW_NEG = re.compile(r"态度差|凶|恶劣|不耐烦|赶出来|敷衍|排队久")


def log(msg: str) -> None:
    print(msg, flush=True)


def fetch(url: str, retries: int = 3, sleep: float = 0.25) -> str:
    last: Exception | None = None
    for i in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept-Language": "zh-CN,zh;q=0.9",
                    "Referer": "https://www.haodf.com/",
                    "Accept": "application/json,text/html,*/*",
                },
            )
            with urllib.request.urlopen(req, timeout=30, context=CTX) as resp:
                raw = resp.read()
            for enc in ("utf-8", "gbk", "gb18030"):
                try:
                    text = raw.decode(enc)
                    time.sleep(sleep)
                    return text
                except UnicodeDecodeError:
                    continue
            text = raw.decode("utf-8", "ignore")
            time.sleep(sleep)
            return text
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(0.8 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last}")


def decode_html(path_or_text: str) -> str:
    return path_or_text


def parse_faculty_list(campus: str) -> list[dict[str, Any]]:
    hid = HOSPITALS[campus]["id"]
    url = f"https://www.haodf.com/hospital/{hid}/keshi/list.html"
    html = fetch(url, sleep=0.4)
    pairs: list[tuple[str, str]] = []
    for m in re.finditer(
        rf'href="https://www\.haodf\.com/hospital/{hid}/keshi/(\d+)\.html"', html
    ):
        kid = m.group(1)
        after = html[m.end() : m.end() + 240]
        name_m = re.search(r">([\u4e00-\u9fffA-Za-z0-9（）()\-·]{2,40})<", after)
        if name_m:
            pairs.append((kid, name_m.group(1).strip()))
    # dedupe keep order
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for kid, name in pairs:
        if kid in seen:
            continue
        seen.add(kid)
        out.append(
            {
                "campus": campus,
                "hospitalId": hid,
                "facultyId": kid,
                "name": name,
            }
        )
    return out


def map_department(dept_name: str) -> tuple[str, str, list[str]]:
    for pat, code, role, tags in DEPT_RULES:
        if pat.search(dept_name):
            return code, role, list(tags)
    # fallback slug-ish code from name
    code = "general_practice"
    if any(k in dept_name for k in ("外科", "骨科", "神经外")):
        return "orthopedics" if "骨" in dept_name else "general_practice", "physician", ["complex_evaluation"]
    return code, "physician", ["first_visit_support"]


def fetch_schedule(faculty_id: str, day: date) -> list[dict[str, Any]]:
    q = urllib.parse.urlencode(
        {"hospitalFacultyId": faculty_id, "date": day.isoformat()}
    )
    url = f"https://www.haodf.com/nhospital/pc/keshi/menzhen/getMenzhenList?{q}"
    raw = fetch(url, sleep=0.15)
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if payload.get("errorCode") != 0:
        return []
    rows: list[dict[str, Any]] = []
    for block in payload.get("data") or []:
        period_label = block.get("time") or ""
        period = 1 if "上午" in period_label else 2 if "下午" in period_label else 0
        for item in block.get("scheduleList") or []:
            info = item.get("doctorInfo") or {}
            rows.append(
                {
                    "scheduleId": item.get("scheduleId"),
                    "doctorId": str(item.get("doctorId")),
                    "scheduleDate": item.get("scheduleDate") or day.isoformat(),
                    "weekDay": item.get("weekDay"),
                    "period": item.get("period") or period,
                    "periodLabel": period_label,
                    "status": item.get("status"),
                    "fee": item.get("fee"),
                    "scheduleSourceType": item.get("scheduleSourceType") or "",
                    "doctorName": info.get("doctorName") or "",
                    "doctorGrade": info.get("doctorGrade") or "",
                    "doctorEducateGrade": info.get("doctorEducateGrade") or "",
                    "hospitalFacultyName": info.get("hospitalFacultyName") or "",
                    "hosName": info.get("hosName") or "",
                    "hospitalFacultyId": str(
                        item.get("hospitalFacultyId") or faculty_id
                    ),
                }
            )
    return rows


def scrape_faculty_doctor_names(campus: str, faculty_id: str) -> list[dict[str, str]]:
    hid = HOSPITALS[campus]["id"]
    url = f"https://www.haodf.com/hospital/{hid}/keshi/{faculty_id}.html"
    try:
        html = fetch(url, sleep=0.2)
    except Exception:
        return []
    docs: list[dict[str, str]] = []
    seen: set[str] = set()
    for m in re.finditer(
        r'href="https://www\.haodf\.com/doctor/(\d+)\.html"[^>]*class="[^"]*doctor-name[^"]*"[^>]*>([^<]+)<',
        html,
    ):
        did, name = m.group(1), m.group(2).strip()
        if did in seen:
            continue
        seen.add(did)
        # title nearby
        ctx = html[m.end() : m.end() + 400]
        title_m = re.search(r"(主任医师|副主任医师|主治医师|住院医师)", ctx)
        docs.append(
            {
                "doctorId": did,
                "name": name,
                "title": title_m.group(1) if title_m else "",
            }
        )
    # fallback: any doctor link with chinese name
    if not docs:
        for m in re.finditer(
            r'href="https://www\.haodf\.com/doctor/(\d+)\.html"[^>]*>([\u4e00-\u9fff·]{2,8})<',
            html,
        ):
            did, name = m.group(1), m.group(2)
            if did in seen or name in ("好大夫在线", "主页", "问诊"):
                continue
            seen.add(did)
            docs.append({"doctorId": did, "name": name, "title": ""})
    return docs


def extract_initial_state(html: str) -> dict[str, Any] | None:
    m = re.search(
        r"window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\s*</script>", html, re.S
    )
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def scrape_doctor_profile(doctor_id: str) -> dict[str, Any]:
    home = fetch(f"https://www.haodf.com/doctor/{doctor_id}.html", sleep=0.2)
    intro = ""
    try:
        intro = fetch(
            f"https://www.haodf.com/doctor/{doctor_id}/xinxi-jieshao.html", sleep=0.15
        )
    except Exception:
        intro = ""
    reviews_html = ""
    try:
        reviews_html = fetch(
            f"https://www.haodf.com/doctor/{doctor_id}/pingjia-zhenliao.html",
            sleep=0.15,
        )
    except Exception:
        reviews_html = ""

    title = ""
    tm = re.search(r"<title>【?([^】<\-]+)", home)
    name = tm.group(1).strip() if tm else ""

    # 擅长：meta / 文本
    specialty = ""
    for src in (home, intro):
        m = re.search(
            r'name="description"\s+content="([^"]{10,400})"', src, re.I
        ) or re.search(
            r'content="([^"]{10,400})"\s+name="description"', src, re.I
        )
        if m and ("擅长" in m.group(1) or "医生" in m.group(1)):
            specialty = m.group(1)
            break
        m2 = re.search(r"擅长[：:]\s*([^<]{8,240})", src)
        if m2:
            specialty = m2.group(1).strip()
            break

    grade_m = re.search(r"(主任医师|副主任医师|主治医师|住院医师)", home + intro)
    if grade_m:
        title = grade_m.group(1)

    # 患者评价
    review_texts: list[str] = []
    attitudes: list[str] = []
    state = extract_initial_state(reviews_html) if reviews_html else None
    blob = json.dumps(state, ensure_ascii=False) if state else reviews_html
    review_texts.extend(
        re.findall(
            r'"(?:content|commentContent|diseaseDetail)"\s*:\s*"((?:\\.|[^"\\]){8,400})"',
            blob,
        )
    )
    attitudes.extend(re.findall(r'"attitude"\s*:\s*"([^"]+)"', blob))
    # unescape
    cleaned: list[str] = []
    for t in review_texts:
        try:
            cleaned.append(json.loads(f'"{t}"'))
        except Exception:
            cleaned.append(t.replace(r"\n", " ").replace(r"\"", '"'))

    return {
        "doctorId": doctor_id,
        "name": name,
        "title": title,
        "specialty": specialty[:300],
        "reviewTexts": cleaned[:30],
        "attitudes": attitudes[:50],
        "homeTitle": tm.group(0) if tm else "",
    }


def pinyin_stub(name: str) -> str:
    # 简单稳定 id：不用完整拼音库，用 unicode 码位压缩
    codes = "".join(f"{ord(c):x}" for c in name[:6])
    return codes[:16]


def infer_profile(
    *,
    campus: str,
    doctor_id: str,
    name: str,
    title: str,
    dept: str,
    specialty: str,
    reviews: list[str],
    attitudes: list[str],
    schedule_hits: int,
) -> dict[str, Any]:
    code, role, tags = map_department(dept)
    tag_set = set(tags)
    evidence_bits = [
        f"好大夫公开页收录；科室「{dept}」。",
    ]
    if specialty:
        evidence_bits.append(f"公开擅长/简介摘录：{specialty[:120]}")
        for pat, add in SPECIALTY_RULES:
            if pat.search(specialty):
                tag_set.update(add)

    # 精神科 vs 咨询：若科室是精神科但擅长偏咨询，不改角色，只加标签时保持谨慎
    if role == "psychiatrist" and re.search(r"心理咨询|CBT|认知行为", specialty or ""):
        tag_set.update(["psychological_counseling", "psychotherapy"])

    pos = sum(1 for a in attitudes if a in ("很满意", "满意"))
    neg = sum(1 for a in attitudes if a in ("不满意", "很不满意"))
    text = "。".join(reviews)
    first_visit = bool(REVIEW_FIRST.search(text)) or pos >= 2
    clear_comm = bool(REVIEW_POS.search(text)) or pos >= 3
    external = bool(re.search(r"外地|远道|外省", text))
    if clear_comm:
        tag_set.add("clear_communication")
    if first_visit:
        tag_set.add("first_visit_support")
    if external:
        tag_set.add("external_patient_process")
    if REVIEW_NEG.search(text) and neg >= pos:
        clear_comm = False

    if schedule_hits >= 3:
        tag_set.add("chronic_management")
        evidence_bits.append(f"近窗口排班出现 {schedule_hits} 次。")

    if reviews:
        evidence_bits.append(
            f"公开患者评价抽样 {len(reviews)} 条（满意倾向 {pos}，不满 {neg}）。"
        )

    evidence_level = "medium"
    if specialty and (pos >= 2 or schedule_hits >= 2):
        evidence_level = "medium"
    if not specialty and not reviews:
        evidence_level = "weak"

    communication = "explanatory" if clear_comm else "unknown"
    surgery = "surgery_decision" in tag_set or "thoracic" in tag_set or "外科" in dept
    conservative = role in ("counselor", "clinical_psychologist") or "conservative" in specialty

    prefix = "xy" if campus == "xiangya" else "xy2"
    doc = {
        "id": f"{prefix}_hdf_{doctor_id}",
        "name": name,
        "hospital": HOSPITALS[campus]["name"],
        "hospitalCampus": campus,
        "departmentCode": code,
        "department": dept,
        "title": title or "医师",
        "serviceRole": role,
        "capabilityTags": sorted(tag_set),
        "evidence": " ".join(evidence_bits)[:360],
        "evidenceLevel": evidence_level,
        "firstVisitFriendly": bool(first_visit),
        "externalPatientFriendly": bool(external),
        "conservativePreference": bool(conservative),
        "surgeryPreference": bool(surgery),
        "communicationStyle": communication,
        "lastVerifiedAt": date.today().isoformat(),
        "uncertainty": "能力画像基于公开科室/排班/患者评价自动归纳，需人工复核；号源以医院官方为准。",
        "sources": [
            "好大夫在线公开医师页",
            "好大夫科室出诊表",
            "好大夫公开患者评价",
        ],
        "haodfDoctorId": doctor_id,
        "specialty": specialty[:240],
        "reviewSignals": {
            "sampleCount": len(reviews),
            "positiveAttitude": pos,
            "negativeAttitude": neg,
            "snippets": reviews[:5],
        },
    }
    return doc


def load_seed_overrides() -> dict[tuple[str, str], dict[str, Any]]:
    """(campus, name) -> curated seed，用于保留人工精标能力。"""
    out: dict[tuple[str, str], dict[str, Any]] = {}
    for path, campus in ((SEED_XY, "xiangya"), (SEED_XY2, "xiangya2")):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for d in data:
            if d.get("isPathCard"):
                continue
            key = (campus, d.get("name", ""))
            if key[1]:
                out[key] = d
    return out


def merge_with_seed(auto: dict[str, Any], seed: dict[str, Any] | None) -> dict[str, Any]:
    if not seed:
        return auto
    # 保留人工能力标签与角色判断，补充公开证据与排班来源
    merged = dict(auto)
    for field in (
        "capabilityTags",
        "serviceRole",
        "departmentCode",
        "firstVisitFriendly",
        "externalPatientFriendly",
        "conservativePreference",
        "surgeryPreference",
        "communicationStyle",
        "evidenceLevel",
    ):
        if seed.get(field) not in (None, "", [], "unknown"):
            merged[field] = seed[field]
    # 合并证据
    merged["evidence"] = (
        f"{seed.get('evidence', '')} | 公开平台补充：{auto.get('evidence', '')}"
    )[:400]
    sources = list(dict.fromkeys([*(seed.get("sources") or []), *(auto.get("sources") or [])]))
    merged["sources"] = sources
    merged["id"] = seed.get("id") or auto["id"]
    merged["uncertainty"] = seed.get("uncertainty") or auto.get("uncertainty")
    return merged


def keep_path_cards(campus: str) -> list[dict[str, Any]]:
    path = SEED_XY if campus == "xiangya" else SEED_XY2
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [d for d in data if d.get("isPathCard")]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=10, help="向前采集排班天数")
    ap.add_argument("--skip-reviews", action="store_true")
    ap.add_argument("--max-doctors-detail", type=int, default=0, help="0=全部")
    ap.add_argument("--campus", choices=["xiangya", "xiangya2", "all"], default="all")
    args = ap.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_SCHEDULE.parent.mkdir(parents=True, exist_ok=True)

    campuses = (
        ["xiangya", "xiangya2"] if args.campus == "all" else [args.campus]
    )

    all_faculties: list[dict[str, Any]] = []
    for campus in campuses:
        log(f"[1/5] 拉取科室列表 {campus} ...")
        facs = parse_faculty_list(campus)
        log(f"  -> {len(facs)} 个科室")
        all_faculties.extend(facs)
    (RAW_DIR / "faculties.json").write_text(
        json.dumps(all_faculties, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 排班采集（近期向前，历史日接口常为空）
    days = [date.today() + timedelta(days=i) for i in range(args.days)]
    schedule_rows: list[dict[str, Any]] = []
    doctors: dict[str, dict[str, Any]] = {}
    schedule_count: dict[str, int] = defaultdict(int)

    log(f"[2/5] 采集排班 {len(all_faculties)} 科室 × {len(days)} 天 ...")
    for i, fac in enumerate(all_faculties, 1):
        campus = fac["campus"]
        fid = fac["facultyId"]
        fname = fac["name"]
        for day in days:
            try:
                rows = fetch_schedule(fid, day)
            except Exception as e:  # noqa: BLE001
                log(f"  ! schedule fail {campus}/{fname}/{day}: {e}")
                continue
            for row in rows:
                row["campus"] = campus
                row["facultyName"] = fname
                schedule_rows.append(row)
                did = row["doctorId"]
                if not did or not row.get("doctorName"):
                    continue
                schedule_count[did] += 1
                prev = doctors.get(did)
                if not prev:
                    doctors[did] = {
                        "doctorId": did,
                        "name": row["doctorName"],
                        "title": row.get("doctorGrade") or "",
                        "campus": campus,
                        "department": row.get("hospitalFacultyName") or fname,
                        "facultyId": row.get("hospitalFacultyId") or fid,
                        "fromSchedule": True,
                    }
                else:
                    if not prev.get("title") and row.get("doctorGrade"):
                        prev["title"] = row["doctorGrade"]
        if i % 10 == 0 or i == len(all_faculties):
            log(
                f"  progress faculties {i}/{len(all_faculties)}, "
                f"doctors={len(doctors)}, slots={len(schedule_rows)}"
            )

    # 科室医生页补漏（不在近窗排班里的人也入库）
    log("[3/5] 科室医生页补全名单 ...")
    for i, fac in enumerate(all_faculties, 1):
        campus = fac["campus"]
        fid = fac["facultyId"]
        try:
            listed = scrape_faculty_doctor_names(campus, fid)
        except Exception as e:  # noqa: BLE001
            log(f"  ! faculty doctors fail {fac['name']}: {e}")
            listed = []
        for d in listed:
            did = d["doctorId"]
            if did not in doctors:
                doctors[did] = {
                    "doctorId": did,
                    "name": d["name"],
                    "title": d.get("title") or "",
                    "campus": campus,
                    "department": fac["name"],
                    "facultyId": fid,
                    "fromSchedule": False,
                }
            elif not doctors[did].get("title") and d.get("title"):
                doctors[did]["title"] = d["title"]
        if i % 15 == 0 or i == len(all_faculties):
            log(f"  progress {i}/{len(all_faculties)}, doctors={len(doctors)}")

    (RAW_DIR / "doctors_index.json").write_text(
        json.dumps(list(doctors.values()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (RAW_DIR / "schedules_raw.json").write_text(
        json.dumps(schedule_rows, ensure_ascii=False), encoding="utf-8"
    )

    # 详情 + 评价
    detail_ids = list(doctors.keys())
    # 优先：近窗有排班的医生
    detail_ids.sort(key=lambda x: (-schedule_count.get(x, 0), x))
    if args.max_doctors_detail > 0:
        detail_ids = detail_ids[: args.max_doctors_detail]

    details: dict[str, dict[str, Any]] = {}
    if not args.skip_reviews:
        log(f"[4/5] 拉取医生简介与患者评价 {len(detail_ids)} 人 ...")
        for i, did in enumerate(detail_ids, 1):
            try:
                details[did] = scrape_doctor_profile(did)
            except Exception as e:  # noqa: BLE001
                log(f"  ! detail fail {did}: {e}")
                details[did] = {
                    "doctorId": did,
                    "name": doctors[did]["name"],
                    "title": doctors[did].get("title") or "",
                    "specialty": "",
                    "reviewTexts": [],
                    "attitudes": [],
                }
            if i % 20 == 0 or i == len(detail_ids):
                log(f"  progress {i}/{len(detail_ids)}")
                (RAW_DIR / "doctor_details.json").write_text(
                    json.dumps(details, ensure_ascii=False, indent=2), encoding="utf-8"
                )
    else:
        log("[4/5] 跳过评价详情")

    # 生成画像并合并人工种子
    log("[5/5] 生成能力画像并写入 doctor-library ...")
    seeds = load_seed_overrides()
    by_campus: dict[str, list[dict[str, Any]]] = {"xiangya": [], "xiangya2": []}

    for did, base in doctors.items():
        campus = base["campus"]
        detail = details.get(did) or {}
        name = detail.get("name") or base["name"]
        # 首页 title 有时带杂质
        name = re.sub(r"[【】\[\]].*", "", name).strip() or base["name"]
        title = detail.get("title") or base.get("title") or "医师"
        dept = base.get("department") or "未标注科室"
        auto = infer_profile(
            campus=campus,
            doctor_id=did,
            name=name,
            title=title,
            dept=dept,
            specialty=detail.get("specialty") or "",
            reviews=detail.get("reviewTexts") or [],
            attitudes=detail.get("attitudes") or [],
            schedule_hits=schedule_count.get(did, 0),
        )
        merged = merge_with_seed(auto, seeds.get((campus, name)))
        by_campus[campus].append(merged)

    for campus in campuses:
        # 保留路径卡 + 未命中公开源的人工精标
        cards = keep_path_cards(campus)
        # 去重：同名同科室保留排班多的
        uniq: dict[str, dict[str, Any]] = {}
        for d in by_campus[campus]:
            key = d["id"]
            uniq[key] = d
        # 再按 name+dept 去重
        by_name: dict[tuple[str, str], dict[str, Any]] = {}
        for d in uniq.values():
            k = (d["name"], d["department"])
            prev = by_name.get(k)
            if not prev:
                by_name[k] = d
            else:
                # keep richer evidence
                if len(d.get("evidence", "")) > len(prev.get("evidence", "")):
                    by_name[k] = d
        final = list(by_name.values())
        seen_names = {d["name"] for d in final}
        for seed in seeds.values():
            if seed.get("hospitalCampus") != campus:
                continue
            if seed.get("name") in seen_names:
                continue
            kept = dict(seed)
            src = list(kept.get("sources") or [])
            if "人工精标种子保留" not in src:
                src.append("人工精标种子保留")
            kept["sources"] = src
            final.append(kept)
            seen_names.add(kept["name"])
        # path cards if missing
        for card in cards:
            if card.get("name") not in seen_names:
                final.append(card)
        final.sort(key=lambda x: (x.get("departmentCode", ""), x.get("name", "")))
        out = OUT_XY if campus == "xiangya" else OUT_XY2
        out.write_text(
            json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        log(f"  wrote {out.relative_to(ROOT)} count={len(final)}")

    # 排班缓存（按医生聚合近窗）
    by_doc_sched: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in schedule_rows:
        did = row["doctorId"]
        campus = row["campus"]
        prefix = "xy" if campus == "xiangya" else "xy2"
        local_id = f"{prefix}_hdf_{did}"
        # also map seed ids by name later in app; store haodf id link
        by_doc_sched[local_id].append(
            {
                "date": row["scheduleDate"],
                "period": row.get("periodLabel") or row.get("period"),
                "status": row.get("status"),
                "fee": row.get("fee"),
                "department": row.get("hospitalFacultyName") or row.get("facultyName"),
                "sourceType": row.get("scheduleSourceType") or "",
            }
        )

    schedule_payload = {
        "source": "haodf",
        "fetchedAt": datetime.now().isoformat(timespec="seconds"),
        "windowDays": args.days,
        "disclaimer": "排班来自好大夫公开出诊表，仅供决策参考；以医院官方挂号平台实时号源为准。",
        "hospitals": {k: {"haodfId": v["id"], "name": v["name"]} for k, v in HOSPITALS.items()},
        "doctors": {
            k: {
                "slots": sorted(v, key=lambda x: (x["date"], str(x["period"]))),
                "upcomingCount": len(v),
                "nextDate": min((x["date"] for x in v), default=None),
            }
            for k, v in by_doc_sched.items()
        },
        "stats": {
            "facultyCount": len(all_faculties),
            "doctorCount": len(doctors),
            "slotCount": len(schedule_rows),
        },
    }
    OUT_SCHEDULE.write_text(
        json.dumps(schedule_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # update manifest
    try:
        manifest = json.loads(OUT_MANIFEST.read_text(encoding="utf-8"))
    except Exception:
        manifest = {}
    total = sum(
        len(json.loads((OUT_XY if c == "xiangya" else OUT_XY2).read_text(encoding="utf-8")))
        for c in campuses
    )
    # recount both files
    total = 0
    for p in (OUT_XY, OUT_XY2):
        if p.exists():
            total += len(json.loads(p.read_text(encoding="utf-8")))
    manifest.update(
        {
            "version": "1.2.0",
            "updatedAt": date.today().isoformat(),
            "disclaimer": (
                "本库覆盖中南大学湘雅医院与湘雅二医院。医生档案主要来自好大夫公开页、科室出诊表与公开患者评价自动归纳，"
                "并与人工精标记录合并；不构成诊疗建议。出诊与号源以医院官方平台为准。"
            ),
            "source": "haodf_public",
            "doctorCount": total,
            "scheduleFetchedAt": schedule_payload["fetchedAt"],
        }
    )
    OUT_MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    log(
        f"DONE doctors≈{total}, schedule_slots={len(schedule_rows)}, "
        f"schedule_file={OUT_SCHEDULE.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
