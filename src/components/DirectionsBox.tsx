export default function DirectionsBox() {
  return (
    <div className="card p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Directions for Tutors
      </h2>
      <ul className="list-disc space-y-2 pl-4 text-sm text-slate-700">
        <li>Please complete a separate record for each student you tutor.</li>
        <li>
          Consider adding extra time to all meetings, coordinating an extra session whenever
          possible, and regularly assigning homework — give your students credit for all
          completed work.
        </li>
        <li>
          For each session, log the date and either the number of hours tutored, or mark{" "}
          <span className="font-medium">TA</span> (Tutor Absent), <span className="font-medium">SA</span>{" "}
          (Student Absent), or <span className="font-medium">H</span> (Holiday).
        </li>
        <li>
          Check off achievements as students reach them — items marked with an asterisk (*) are
          core outcome measures.
        </li>
        <li>
          If a student is no longer being tutored, use the button at the bottom of their page and
          notify the office as soon as possible.
        </li>
      </ul>
    </div>
  );
}
