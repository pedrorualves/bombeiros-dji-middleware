import { Flame, Radio, Image, AlertTriangle, CheckCircle } from "lucide-react";

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold">Bombeiros DJI Middleware</h1>
        </div>
      </header>

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Radio className="w-5 h-5" />}
            label="Drones Registered"
            value="--"
            color="bg-blue-600"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Syncs Today"
            value="--"
            color="bg-green-600"
          />
          <StatCard
            icon={<Image className="w-5 h-5" />}
            label="Media Files"
            value="--"
            color="bg-purple-600"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Failed Syncs"
            value="--"
            color="bg-red-600"
          />
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <p className="text-slate-400">
            Connect your first drone to see activity here.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${color} p-2 rounded-lg`}>{icon}</div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
