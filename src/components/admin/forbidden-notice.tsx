/** 권한이 없는 직원에게 보이는 안내 (화면 접근은 막고 이유를 알린다). */
export function ForbiddenNotice({ text }: { text: string }) {
  return (
    <section
      role="note"
      className="rounded-sm border border-n200 bg-white p-6 text-dense text-n700"
      data-testid="admin-forbidden"
    >
      {text}
    </section>
  );
}
