"use client";
import { useState } from "react";
import { Check, CheckCircle2, Info, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
export function ComponentGallery({ confirm }: { confirm: () => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>Thành phần</h1>
        <p className="subtitle">Nhất quán từ những chi tiết nhỏ.</p>
      </div>
      <section className="panel gallery-section">
        <div className="section-heading">
          <h2>Nút thao tác</h2>
          <span>44px tối thiểu</span>
        </div>
        <div className="button-samples">
          <Button onClick={() => toast.success("Thao tác mẫu đã hoàn tất.")}>
            <Plus />
            Chính
          </Button>
          <Button variant="outline" onClick={() => toast.info("Bạn vừa chọn thao tác phụ.")}>
            Phụ
          </Button>
          <Button variant="ghost" onClick={() => toast("Một thông báo gọn gàng.")}>
            Nhẹ
          </Button>
          <Button variant="destructive" onClick={confirm}>
            Xóa mẫu
          </Button>
          <Button disabled>Vô hiệu hóa</Button>
        </div>
      </section>
      <section className="panel gallery-section">
        <h2>Nhập liệu & phản hồi</h2>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              toast.success(`Đã nhận: ${value}`);
            }, 600);
          }}
        >
          <div>
            <Label htmlFor="sample-input">Tên hiển thị mẫu</Label>
            <Input
              id="sample-input"
              required
              maxLength={60}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Nhập tên của bạn"
            />
            <p className="help">Ví dụ minh họa, không thay đổi hồ sơ của bạn.</p>
          </div>
          <Button disabled={loading} type="submit">
            {loading ? <LoaderCircle className="animate-spin" /> : <Check />}{" "}
            {loading ? "Đang xử lý…" : "Thử thông báo"}
          </Button>
        </form>
      </section>
      <section className="panel gallery-section">
        <h2>Trạng thái rõ ràng</h2>
        <div className="badge-samples">
          <Badge className="success-badge">
            <CheckCircle2 />
            Hoàn tất
          </Badge>
          <Badge className="warning-badge">Đang chờ</Badge>
          <Badge variant="outline">Bản nháp</Badge>
        </div>
        <div className="info-notice">
          <Info size={18} />
          <p>Mỗi trạng thái đều có nhãn chữ để dễ nhận biết.</p>
        </div>
      </section>
      <section className="panel gallery-section">
        <h2>Chuyển nội dung</h2>
        <Tabs defaultValue="simple">
          <TabsList aria-label="Ví dụ chuyển nội dung">
            <TabsTrigger value="simple">Gọn gàng</TabsTrigger>
            <TabsTrigger value="accessible">Dễ sử dụng</TabsTrigger>
          </TabsList>
          <TabsContent value="simple">
            <p className="muted">
              Một hành động chính, vừa đủ thông tin. Giữ mọi thứ tập trung vào việc cần làm.
            </p>
          </TabsContent>
          <TabsContent value="accessible">
            <p className="muted">
              Thử dùng Tab và phím mũi tên. Vùng chạm rộng và tiêu điểm bàn phím luôn rõ.
            </p>
          </TabsContent>
        </Tabs>
      </section>
      <p className="footnote">Dùng chung màu sắc, kiểu chữ và thành phần trên mọi màn hình.</p>
    </>
  );
}
