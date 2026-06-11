import { Link } from "react-router-dom";
import { BOOKS, GROUPS, OT_GROUPS, NT_GROUPS, bookDisplayName } from "../lib/canon";
import { getSettings } from "../lib/storage";

export default function BookList() {
  const translation = getSettings().translation;

  const section = (title: string, groups: readonly string[]) => (
    <>
      <h2 className="testament-title">{title}</h2>
      {groups.map((g) => {
        const books = BOOKS.filter((b) => b.group === g);
        if (!books.length) return null;
        return (
          <div key={g}>
            <div className="group-title">{g}</div>
            <div className="book-grid">
              {books.map((b) => (
                <Link key={b.slug} to={`/read/${translation}/${b.slug}/1`} title={b.name}>
                  {bookDisplayName(b, translation)}
                  {b.deutero && (
                    <span className="deutero-mark" title="Deuterocanonical">
                      †
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <>
      <h1 className="page-title">The Books of the Holy Bible</h1>
      <p className="subtitle">
        The complete Catholic canon of 73 books, in traditional Vulgate order.{" "}
        <span className="small sans">
          († = deuterocanonical — always part of the Catholic Bible)
        </span>
      </p>
      {section("The Old Testament", OT_GROUPS)}
      {section("The New Testament", NT_GROUPS)}
      {section("Appendix to the Clementine Vulgate", GROUPS.filter((g) => g === "Appendix"))}
      <p className="muted small sans" style={{ marginTop: "1rem" }}>
        The appendix books are not part of the canon; they are preserved here, as in
        printed editions of the Clementine Vulgate, "lest they perish entirely."
      </p>
    </>
  );
}
