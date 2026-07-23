import { Navigate } from "react-router-dom";

/** 旧 /recommend 入口改走陪诊师匹配流 */
export function RecommendPage() {
  return <Navigate to="/app/match" replace />;
}
