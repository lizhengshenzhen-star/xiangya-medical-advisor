# 医生信息文件库

本产品**仅服务湘雅医院 + 湘雅二医院**，不含附三。

## 数据来源

- 好大夫公开科室列表、近期出诊表（`getMenzhenList`）
- 好大夫公开医师页 / 简介
- 好大夫公开患者评价（弱信号，不构成疗效判断）
- 人工精标种子记录会与同名医生合并（保留更稳妥的角色/能力标签）

重新采集：

```bash
python3 scripts/haodf_build_doctor_library.py --days 8
```

排班缓存写入：`src/data/schedules/recent.json`

## 怎么维护

1. 按院区编辑 JSON：
   - `campuses/xiangya.json`（湘雅医院）
   - `campuses/xiangya2.json`（湘雅二医院）
2. 改完后把 `manifest.json` 的 `version` +1，本地缓存会自动刷新。
3. 不要在业务代码里再写死医生名单。

## 字段要求

见 `manifest.json` 的 `fieldGuide`。能力标签必须用枚举值，不要自由造词。

## 合规

- `evidence` 只写公开可核验信息
- 精神科与心理咨询必须用不同 `serviceRole` / `departmentCode`
- 患者评价仅用于沟通/流程友好等弱信号，禁止当作疗效承诺
