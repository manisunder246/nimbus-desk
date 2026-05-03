import RaiseTicketForm from '../components/RaiseTicketForm';

export default function RaiseTicketPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Raise a new ticket</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Tell us what's going on. The classifier will tune the priority based on what you describe.
        </p>
      </div>
      <RaiseTicketForm />
    </div>
  );
}
