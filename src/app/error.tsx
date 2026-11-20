"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app-frame error-page">
      <h1>Chưa mở được màn hình</h1>
      <p>Hãy thử lại. Dữ liệu đã lưu trên thiết bị vẫn được giữ.</p>
      <Button onClick={reset}>Thử lại</Button>
    </main>
  );
}
