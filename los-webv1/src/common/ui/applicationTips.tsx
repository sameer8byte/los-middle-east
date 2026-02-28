export function ApplicationTips() {
  return (
<div className="max-w-sm p-6  bg-white rounded-brand shadow-md">
  <h2 className="text-xl font-bold mb-1 text-heading">Application Tips</h2>
  <p className="text-label-muted mb-4">
    Follow these tips for a smooth application process
  </p>
  <ul className="space-y-3 text-label">
    <li className="flex items-start">
      <span className="text-success mr-2 mt-1">✔️</span> Have your ID ready
    </li>
    <li className="flex items-start">
      <span className="text-success mr-2 mt-1">✔️</span> Provide accurate bank account information
    </li>
    <li className="flex items-start">
      <span className="text-success mr-2 mt-1">✔️</span> Double-check your income details
    </li>
    <li className="flex items-start">
      <span className="text-success mr-2 mt-1">✔️</span> Ensure your phone is nearby for verification
    </li>
  </ul>
</div>
  );
}
