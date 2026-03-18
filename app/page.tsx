import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  FileCheck2,
  Layers3,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Tạo đề thi linh hoạt",
      description:
        "Hỗ trợ trắc nghiệm và tự luận, cấu hình thời gian, số lượt làm và hạn nộp theo từng lớp học.",
      icon: FileCheck2,
    },
    {
      title: "Quản lý kết quả minh bạch",
      description:
        "Chấm điểm ngay sau nộp bài, xem lại đáp án đúng/sai và quản lý lịch sử làm bài theo từng học viên.",
      icon: Layers3,
    },
    {
      title: "Thống kê theo thời gian thực",
      description:
        "Theo dõi số người tham gia, số lượt làm, điểm trung bình và hiệu quả bài thi trong một màn hình.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.16),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur md:p-8">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Open Exam
              </span>
              <span className="text-sm text-slate-500">
                Nền tảng kiểm tra trực tuyến
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đăng nhập
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Vào dashboard
              </Link>
            </div>
          </header>

          <section className="grid gap-8 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                <ShieldCheck size={14} />
                Tin cậy cho giảng dạy và đánh giá
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight text-slate-900 md:text-5xl">
                Chuyên nghiệp hoá quy trình kiểm tra trực tuyến trong một nền
                tảng thống nhất
              </h1>
              <p className="mt-4 max-w-xl text-base text-slate-600 md:text-lg">
                Open Exam giúp bạn tạo đề, quản lý lượt làm, theo dõi kết quả,
                và phân tích hiệu quả bài thi nhanh chóng. Tất cả đều tối ưu cho
                lớp học hiện đại.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/exam/add"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Tạo bài thi ngay
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/exam/join"
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tham gia bằng mã
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-2xl font-black text-slate-900">100%</p>
                  <p className="text-xs text-slate-600">
                    Theo dõi lượt làm rõ ràng
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-2xl font-black text-slate-900">Tức thì</p>
                  <p className="text-xs text-slate-600">
                    Cập nhật kết quả sau nộp
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-2xl font-black text-slate-900">
                    1 nền tảng
                  </p>
                  <p className="text-xs text-slate-600">
                    Cho tạo, thi, phân tích
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Tổng quan vận hành</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Đang hoạt động
                </span>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="inline-flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    Học viên tham gia
                  </span>
                  <strong>Liên tục</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 size={16} className="text-indigo-600" />
                    Quản lý thời gian thi
                  </span>
                  <strong>Linh hoạt</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="inline-flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-600" />
                    Báo cáo thống kê
                  </span>
                  <strong>Theo thời gian thực</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-700">
                  <feature.icon size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Bắt đầu trong 3 bước
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Bước 1
                </p>
                <p className="mt-1 font-semibold text-slate-800">Tạo bài thi</p>
                <p className="mt-1 text-sm text-slate-600">
                  Cấu hình câu hỏi, thời gian, số lượt làm và quyền xem kết quả.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Bước 2
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  Chia sẻ mã thi
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Gửi mã hoặc link bài thi cho học viên để tham gia nhanh.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Bước 3
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  Theo dõi thống kê
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Quan sát số người làm, số lượt làm và chất lượng bài thi.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  Sẵn sàng triển khai cho lớp học của bạn?
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Khởi tạo bài thi đầu tiên chỉ trong vài phút với Open Exam.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  Đăng nhập ngay
                </Link>
                <Link
                  href="/exam/start"
                  className="rounded-xl border border-slate-500 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Xem danh sách bài thi
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
