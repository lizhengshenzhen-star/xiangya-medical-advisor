import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { AppUser, AppUserRole } from "../../models/companion";
import { ROLE_LABELS } from "../../models/companion";
import { useCurrentUser } from "../../state/CurrentUserProvider";
import { useRepos } from "../../state/RepoProvider";

export function AdminUsersPage() {
  const { users: userRepo } = useRepos();
  const { refresh } = useCurrentUser();
  const [list, setList] = useState<AppUser[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppUserRole>("companion");

  const reload = async () => {
    setList(await userRepo.list());
    await refresh();
  };

  useEffect(() => {
    void reload();
  }, [userRepo]);

  return (
    <div className="decision-root mx-auto max-w-[900px] space-y-4 p-4">
      <h1 className="text-2xl font-bold">用户管理</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新增本地用户</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={role}
            onChange={(e) => setRole(e.target.value as AppUserRole)}
          >
            {(Object.keys(ROLE_LABELS) as AppUserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              await userRepo.create(name.trim(), role);
              setName("");
              await reload();
            }}
          >
            添加
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2">姓名</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>使用次数</th>
                <th>最后使用</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2">{u.name}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td>{u.consultCount}</td>
                  <td>{new Date(u.lastActiveAt).toLocaleString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
