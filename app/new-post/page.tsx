import ManualPostForm from "@/components/ManualPostForm";

export default function NewPostPage() {
  return (
    <section className="section container">
      <span className="tag-eyebrow">Manual generation · / new-post</span>
      <div className="mini">One off</div>
      <h2 className="page-title">
        One post, <span className="accent">your context.</span>
      </h2>
      <p className="page-sub">
        For lead magnets, events, webinar promos — anything outside the
        bi-monthly rotation. Drop a brief, optional reference links, and
        we&apos;ll generate a brand-aligned post you can review and schedule.
      </p>

      <div style={{ maxWidth: 720 }}>
        <ManualPostForm />
      </div>
    </section>
  );
}
