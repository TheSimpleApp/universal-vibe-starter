import { getUploadUrl } from "@/services/mux/actions";

export default function Dashboard() {
  return (
    <div className="p-10 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Welcome Back</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 border rounded-lg bg-card">
          <h3 className="font-semibold">Stripe Status</h3>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        {/* Example of using a module if it exists */}
        <div className="p-6 border rounded-lg bg-card">
          <h3 className="font-semibold">Upload Video</h3>
          <p className="text-sm text-muted-foreground mb-4">Requires Mux Module</p>
          <form action={getUploadUrl}>
            <button className="bg-black text-white px-4 py-2 rounded text-sm">
              Generate Upload URL
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}