"use client";

import { type ChangeEvent, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ListTodo,
  Settings,
  Clock,
  Calendar,
  ShieldCheck,
  Eye,
  Trophy,
  FileJson,
  Upload,
} from "lucide-react";
import Button from "@/components/ui/button";

type Question = {
  type: "multiple-choice" | "essay";
  title: string;
  answers: string[];
  correct: number | string;
  points: number;
};

const DEFAULT_QUESTION: Question = {
  type: "multiple-choice",
  title: "",
  answers: ["", "", "", ""],
  correct: 0,
  points: 10,
};

const JSON_TEMPLATE = {
  questions: [
    {
      type: "multiple-choice",
      title: "2 + 2 bằng bao nhiêu?",
      answers: ["1", "2", "3", "4"],
      correct: 3,
      points: 10,
    },
    {
      type: "essay",
      title: "Nêu định nghĩa đạo hàm.",
      answers: [],
      correct: "Đạo hàm của hàm số tại một điểm là giới hạn tỉ số...",
      points: 15,
    },
  ],
};

type ImportedQuestion = {
  type?: unknown;
  title?: unknown;
  answers?: unknown;
  correct?: unknown;
  points?: unknown;
};

export default function CreateExamPage() {
  const [examSettings, setExamSettings] = useState({
    title: "",
    description: "",
    duration: 60, // phút
    unlimitedTime: false,
    maxAttempts: 1,
    unlimitedAttempts: false,
    allowResultReview: false,
    deadline: "",
    isMonitored: false,
    recordBehavior: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. State cho danh sách câu hỏi
  const [questions, setQuestions] = useState<Question[]>([DEFAULT_QUESTION]);

  const addQuestion = () => {
    setQuestions([...questions, { ...DEFAULT_QUESTION }]);
  };

  const normalizeImportedQuestion = (
    raw: ImportedQuestion,
  ): Question | null => {
    const rawType = raw.type === "essay" ? "essay" : "multiple-choice";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const points = Number.parseInt(String(raw.points ?? 0), 10);

    if (!title || !Number.isFinite(points) || points <= 0) {
      return null;
    }

    if (rawType === "multiple-choice") {
      const answers = Array.isArray(raw.answers)
        ? raw.answers
            .map((answer) =>
              typeof answer === "string" ? answer.trim() : String(answer),
            )
            .filter((answer) => answer.length > 0)
        : [];

      if (answers.length < 2) {
        return null;
      }

      const maxCorrectIndex = answers.length - 1;
      const correctRaw = Number.parseInt(String(raw.correct ?? 0), 10);
      const correct = Number.isFinite(correctRaw)
        ? Math.min(Math.max(correctRaw, 0), maxCorrectIndex)
        : 0;

      return {
        type: "multiple-choice",
        title,
        answers,
        correct,
        points,
      };
    }

    return {
      type: "essay",
      title,
      answers: [],
      correct: typeof raw.correct === "string" ? raw.correct.trim() : "",
      points,
    };
  };

  const handleImportQuestions = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setErrorMessage("");
    setImportMessage("");

    try {
      const content = await selectedFile.text();
      const parsed = JSON.parse(content) as
        | ImportedQuestion[]
        | { questions?: ImportedQuestion[] };

      const rawQuestions = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.questions)
          ? parsed.questions
          : [];

      if (rawQuestions.length === 0) {
        setErrorMessage(
          "File JSON không có dữ liệu câu hỏi. Hãy dùng mảng [] hoặc object có key questions.",
        );
        return;
      }

      const normalized = rawQuestions
        .map((item) => normalizeImportedQuestion(item))
        .filter((item): item is Question => item !== null);

      if (normalized.length === 0) {
        setErrorMessage(
          "Không tìm thấy câu hỏi hợp lệ trong file. Vui lòng kiểm tra lại định dạng JSON.",
        );
        return;
      }

      setQuestions(normalized);
      setCreatedCode("");

      const skipped = rawQuestions.length - normalized.length;
      setImportMessage(
        skipped > 0
          ? `Đã nhập ${normalized.length} câu hỏi. Bỏ qua ${skipped} câu không hợp lệ.`
          : `Đã nhập thành công ${normalized.length} câu hỏi từ JSON.`,
      );
    } catch {
      setErrorMessage(
        "Không đọc được file JSON. Vui lòng kiểm tra cú pháp JSON trước khi tải lên.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(JSON_TEMPLATE, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "open-exam-question-template.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = <K extends keyof Question>(
    index: number,
    field: K,
    value: Question[K],
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleCreateExam = async () => {
    setErrorMessage("");
    setCreatedCode("");

    if (!examSettings.title.trim()) {
      setErrorMessage("Vui lòng nhập tiêu đề bài kiểm tra.");
      return;
    }

    if (questions.length === 0) {
      setErrorMessage("Cần ít nhất 1 câu hỏi.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: examSettings.title,
          description: examSettings.description,
          durationMinutes: examSettings.unlimitedTime
            ? 0
            : examSettings.duration,
          maxAttempts: examSettings.unlimitedAttempts
            ? 0
            : examSettings.maxAttempts,
          allowResultReview: examSettings.allowResultReview,
          deadline: examSettings.deadline || undefined,
          isMonitored: examSettings.isMonitored,
          recordBehavior: examSettings.recordBehavior,
          questions,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message || "Không thể tạo bài kiểm tra.");
        return;
      }

      setCreatedCode(data.exam.code as string);
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 py-4 px-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Cấu hình bài thi
          </h1>
          <p className="text-sm text-slate-500">
            Tổng điểm:
            {questions.reduce((acc, curr) => acc + (curr.points || 0), 0)}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Xem trước</Button>
          <Button onClick={handleCreateExam} isLoading={isSaving}>
            Lưu bài
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}

      {createdCode ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Tạo bài thành công. Mã bài thi:{" "}
          <span className="font-bold">{createdCode}</span>
        </p>
      ) : null}

      {importMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {importMessage}
        </p>
      ) : null}

      {/* SECTION 1: THIẾT LẬP BÀI THI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-2">
          <Settings size={20} />
          <h2>Thông tin chung & Giám sát</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tiêu đề */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tiêu đề bài kiểm tra
            </label>
            <input
              type="text"
              value={examSettings.title}
              onChange={(e) =>
                setExamSettings({ ...examSettings, title: e.target.value })
              }
              placeholder="Ví dụ: Kiểm tra giữa kỳ môn Giải tích"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mô tả (tuỳ chọn)
            </label>
            <textarea
              value={examSettings.description}
              onChange={(e) =>
                setExamSettings({
                  ...examSettings,
                  description: e.target.value,
                })
              }
              placeholder="Thêm hướng dẫn cho học viên"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-24"
            />
          </div>

          {/* Thời gian & Hạn nộp */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                <Clock size={16} /> Thời gian làm bài (phút)
              </label>
              <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={examSettings.unlimitedTime}
                  onChange={(e) =>
                    setExamSettings({
                      ...examSettings,
                      unlimitedTime: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-indigo-600"
                />
                Không giới hạn thời gian làm bài
              </label>
              <input
                type="number"
                value={examSettings.duration}
                min={1}
                disabled={examSettings.unlimitedTime}
                onChange={(e) =>
                  setExamSettings({
                    ...examSettings,
                    duration: Math.max(
                      1,
                      Number.parseInt(e.target.value, 10) || 1,
                    ),
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none disabled:bg-slate-100"
              />
              {examSettings.unlimitedTime ? (
                <p className="mt-2 text-xs text-slate-500">
                  Hệ thống sẽ lưu thời gian làm bài là "không giới hạn".
                </p>
              ) : null}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                <Clock size={16} /> Số lần được làm
              </label>
              <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={examSettings.unlimitedAttempts}
                  onChange={(e) =>
                    setExamSettings({
                      ...examSettings,
                      unlimitedAttempts: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-indigo-600"
                />
                Không giới hạn lượt thử
              </label>
              <input
                type="number"
                min={1}
                value={examSettings.maxAttempts}
                disabled={examSettings.unlimitedAttempts}
                onChange={(e) =>
                  setExamSettings({
                    ...examSettings,
                    maxAttempts: Math.max(
                      1,
                      Number.parseInt(e.target.value, 10) || 1,
                    ),
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none disabled:bg-slate-100"
              />
              {examSettings.unlimitedAttempts ? (
                <p className="mt-2 text-xs text-slate-500">
                  Hệ thống sẽ lưu số lượt thử là "không giới hạn".
                </p>
              ) : null}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                <Calendar size={16} /> Hạn chót nộp bài
              </label>
              <input
                type="datetime-local"
                value={examSettings.deadline}
                onChange={(e) =>
                  setExamSettings({ ...examSettings, deadline: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Chế độ giám sát */}
          <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">
                  Giám sát nghiêm ngặt
                </span>
              </div>
              <input
                type="checkbox"
                checked={examSettings.isMonitored}
                onChange={(e) =>
                  setExamSettings({
                    ...examSettings,
                    isMonitored: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-indigo-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">
                  Ghi lại hành vi (Log)
                </span>
              </div>
              <input
                type="checkbox"
                checked={examSettings.recordBehavior}
                onChange={(e) =>
                  setExamSettings({
                    ...examSettings,
                    recordBehavior: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-indigo-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">
                  Cho phép thí sinh xem điểm và xem lại kết quả
                </span>
              </div>
              <input
                type="checkbox"
                checked={examSettings.allowResultReview}
                onChange={(e) =>
                  setExamSettings({
                    ...examSettings,
                    allowResultReview: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-indigo-600"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-italic">
              * Phát hiện chuyển tab, thoát toàn màn hình.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileJson size={20} className="text-indigo-600" /> Nhập câu hỏi từ
              file JSON
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Hỗ trợ 2 dạng: mảng câu hỏi trực tiếp{" "}
              <span className="font-semibold">[]</span> hoặc object có key{" "}
              <span className="font-semibold">questions</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Upload size={16} /> Tải file JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tải file mẫu
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportQuestions(event)}
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">
            Định dạng JSON yêu cầu:
          </p>
          <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {`{
  "questions": [
    {
      "type": "multiple-choice",
      "title": "2 + 2 bằng bao nhiêu?",
      "answers": ["1", "2", "3", "4"],
      "correct": 3,
      "points": 10
    },
    {
      "type": "essay",
      "title": "Nêu định nghĩa đạo hàm.",
      "answers": [],
      "correct": "Đạo hàm là...",
      "points": 15
    }
  ]
}`}
          </pre>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              <span className="font-semibold">type</span>: "multiple-choice"
              hoặc "essay"
            </li>
            <li>
              <span className="font-semibold">title</span>: nội dung câu hỏi
            </li>
            <li>
              <span className="font-semibold">answers</span>: bắt buộc với trắc
              nghiệm, tối thiểu 2 đáp án
            </li>
            <li>
              <span className="font-semibold">correct</span>: với trắc nghiệm là
              index đáp án đúng (bắt đầu từ 0), với tự luận là đáp án mẫu
            </li>
            <li>
              <span className="font-semibold">points</span>: số điểm của câu
              hỏi, phải lớn hơn 0
            </li>
          </ul>
        </div>
      </div>

      {/* SECTION 2: DANH SÁCH CÂU HỎI */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ListTodo size={20} className="text-indigo-600" /> Nội dung câu hỏi
        </h2>

        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateQuestion(qIdx, "type", "multiple-choice")
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${q.type === "multiple-choice" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  TRẮC NGHIỆM
                </button>
                <button
                  onClick={() => updateQuestion(qIdx, "type", "essay")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${q.type === "essay" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  TỰ LUẬN
                </button>
              </div>

              {/* Nhập điểm */}
              <div className="flex items-center gap-2 mr-8">
                <Trophy size={16} className="text-orange-500" />
                <input
                  type="number"
                  value={q.points}
                  onChange={(e) =>
                    updateQuestion(
                      qIdx,
                      "points",
                      Number.parseInt(e.target.value, 10) || 0,
                    )
                  }
                  className="w-16 border-b border-slate-200 text-center outline-none focus:border-orange-500 font-bold"
                />
                <span className="text-xs text-slate-400">điểm</span>
              </div>

              <button
                onClick={() => removeQuestion(qIdx)}
                className="text-slate-300 hover:text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <input
              type="text"
              placeholder={`Câu hỏi ${qIdx + 1}...`}
              value={q.title}
              onChange={(e) => updateQuestion(qIdx, "title", e.target.value)}
              className="w-full text-lg font-semibold border-none outline-none mb-6 focus:ring-0 placeholder:text-slate-300"
            />

            {q.type === "multiple-choice" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.answers.map((ans, aIdx) => (
                  <div
                    key={aIdx}
                    className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"
                  >
                    <button
                      onClick={() => updateQuestion(qIdx, "correct", aIdx)}
                      className={
                        q.correct === aIdx ? "text-green-500" : "text-slate-300"
                      }
                    >
                      {q.correct === aIdx ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <Circle size={24} />
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder={`Đáp án ${String.fromCharCode(65 + aIdx)}`}
                      value={ans}
                      onChange={(e) => {
                        const newAns = [...q.answers];
                        newAns[aIdx] = e.target.value;
                        updateQuestion(qIdx, "answers", newAns);
                      }}
                      className="bg-transparent outline-none w-full"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                placeholder="Đáp án mẫu..."
                value={q.correct as string}
                onChange={(e) =>
                  updateQuestion(qIdx, "correct", e.target.value)
                }
                className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-slate-100 focus:border-indigo-300 min-h-25"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 font-bold"
      >
        <Plus size={24} /> THÊM CÂU HỎI MỚI
      </button>
    </div>
  );
}
