import { Navigate } from "react-router-dom";

/** 旧多轮追问页已废弃：统一走「先推荐」流 */
export function ListenFollowUpPage() {
  return <Navigate to="/" replace />;
}
