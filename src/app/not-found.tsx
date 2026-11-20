import { appRoot } from "@/config/app";
export default function NotFound() {
  return (
    <main className="app-frame error-page">
      <h1>Không tìm thấy trang</h1>
      <p>Liên kết này không còn khả dụng.</p>
      <a href={appRoot}>Về trang chủ</a>
    </main>
  );
}
