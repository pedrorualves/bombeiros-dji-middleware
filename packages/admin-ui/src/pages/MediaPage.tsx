import { useState, useEffect, useCallback } from "react";
import { Image, Video, Thermometer, Scan, CheckCircle, XCircle } from "lucide-react";
import { apiFetch } from "../api-client";
import { useAuth } from "../auth-context";

interface MediaRecord {
  id: string;
  drone_sn: string;
  filename: string;
  media_type: string;
  camera: string;
  latitude: number;
  longitude: number;
  altitude: number;
  file_size_bytes: number;
  arcgis_synced: number;
  arcgis_object_id: number | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Image> = {
  photo: Image,
  video: Video,
  thermal: Thermometer,
  panorama: Scan,
};

export function MediaPage() {
  const { user } = useAuth();
  const orgId = user?.org_id;
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchMedia = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data } = await apiFetch<{
        media: MediaRecord[];
        total: number;
      }>(`/api/orgs/${orgId}/media?page=${page}&per_page=24`);
      setMedia(data.media);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [orgId, page]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const totalPages = Math.ceil(total / 24);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <span className="text-sm text-slate-400">{total} files</span>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : media.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No media uploaded yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Media will appear here after drones upload photos and videos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {media.map((item) => {
              const Icon = typeIcons[item.media_type] ?? Image;
              return (
                <div
                  key={item.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
                >
                  <div className="h-36 bg-slate-700/50 flex items-center justify-center">
                    <Icon className="w-10 h-10 text-slate-500" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-medium truncate" title={item.filename}>
                      {item.filename}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="capitalize">{item.media_type}</span>
                      <span>{formatBytes(item.file_size_bytes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">{item.drone_sn}</span>
                      <span className="capitalize">{item.camera}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.arcgis_synced ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-3 h-3" /> Synced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400">
                          <XCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>
                    {item.latitude !== 0 && (
                      <p className="text-xs text-slate-500">
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} ({item.altitude.toFixed(0)}m)
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-sm disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-sm disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
