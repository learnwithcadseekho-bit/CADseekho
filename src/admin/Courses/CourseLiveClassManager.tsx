import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { deleteLiveClass, getLiveClass, saveLiveClass } from "@/services/admin/adminLiveClassService";

// Zoom meeting IDs are shown with spaces ("812 3456 7890"); store digits only.
function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function CourseLiveClassManager({ courseId, isLive }: { courseId: string; isLive: boolean }) {
  const [meetingNumber, setMeetingNumber] = useState("");
  const [passcode, setPasscode] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    getLiveClass(courseId)
      .then((live) => {
        setMeetingNumber(live?.zoom_meeting_number ?? "");
        setPasscode(live?.zoom_passcode ?? "");
        setHasSaved(!!live);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  async function handleSave() {
    const mn = digitsOnly(meetingNumber);
    if (mn.length < 9 || mn.length > 12) {
      setMessage({ type: "error", text: "Enter the Zoom meeting ID (9–12 digits)." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveLiveClass({ course_id: courseId, zoom_meeting_number: mn, zoom_passcode: passcode.trim() });
      setMeetingNumber(mn);
      setHasSaved(true);
      setMessage({ type: "success", text: "Saved. Enrolled students can now join from their dashboard." });
    } catch {
      setMessage({ type: "error", text: "Couldn't save the Zoom details." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setMessage(null);
    try {
      await deleteLiveClass(courseId);
      setMeetingNumber("");
      setPasscode("");
      setHasSaved(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-form-card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: "var(--space-2)" }}>Live Class (Zoom)</h2>
      <p style={{ marginBottom: "var(--space-4)", color: "var(--slate)" }}>
        Use one recurring Zoom meeting for this batch, hosted from the same Zoom account as the Meeting SDK
        app. Students join inside the site at /classroom; these details are never shown to them.
      </p>

      {!isLive && (
        <FormMessage type="error">
          Students only see the "Join Live Class" button on courses whose Format is "Live, Instructor-Led".
          Change the Format above and click Save Course to turn it on.
        </FormMessage>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
          <div className="admin-form-row">
            <TextField
              label="Zoom Meeting ID"
              placeholder="e.g. 812 3456 7890"
              value={meetingNumber}
              onChange={(e) => setMeetingNumber(e.target.value)}
            />
            <TextField
              label="Meeting Passcode"
              placeholder="Leave empty if the meeting has none"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
          <div className="admin-form-actions" style={{ marginTop: "var(--space-4)" }}>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Zoom Details"}
            </Button>
            {hasSaved && (
              <Button type="button" variant="outline" onClick={handleRemove} disabled={saving}>
                Remove
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
