import { TbMailBitcoin } from "react-icons/tb";

const contacts = [
  { name: "Technical Support", email: "tech@8byte.ai" },
  { name: "Abhishek (Business)", email: "ab@8byte.ai" },
];

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-[var(--secondary-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
          Technical Help Center
        </h1>
        <p className="text-lg text-[var(--muted-foreground)]">
          Need help? Contact our support team below.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
        {contacts.map((contact, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
          >
            <TbMailBitcoin className="w-6 h-6 text-indigo-500" />
            <div>
              <p className="font-semibold text-[var(--foreground)]">{contact.name}</p>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-primary hover:underline"
              >
                {contact.email}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpCenter;
