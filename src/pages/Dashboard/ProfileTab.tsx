import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/services/profileService";
import {
  EXPERIENCE_OPTIONS,
  INTERESTED_COURSE_OPTIONS,
  USER_TYPE_OPTIONS,
  type ExperienceLevel,
  type InterestedCourseSlug,
  type UserType,
} from "@/types/profile";

export function ProfileTab() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [userType, setUserType] = useState<UserType>(profile?.user_type ?? "other");
  const [experience, setExperience] = useState<ExperienceLevel | "">(profile?.experience ?? "");
  const [interestedCourses, setInterestedCourses] = useState<InterestedCourseSlug[]>(
    profile?.interested_courses ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setStatus("idle");
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        user_type: userType,
        experience: experience || null,
        interested_courses: interestedCourses,
      });
      await refreshProfile();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {status === "success" && <FormMessage type="success">Profile updated.</FormMessage>}
      {status === "error" && <FormMessage type="error">Couldn't save your profile. Please try again.</FormMessage>}

      <TextField label="Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <TextField label="Email" type="email" value={user?.email ?? ""} disabled />
      <TextField label="Mobile Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <SelectField
        label="I am a"
        options={USER_TYPE_OPTIONS}
        value={userType}
        onChange={(e) => setUserType(e.target.value as UserType)}
      />
      <SelectField
        label="Experience"
        placeholder="Select one"
        options={EXPERIENCE_OPTIONS}
        value={experience}
        onChange={(e) => setExperience(e.target.value as ExperienceLevel)}
      />
      <CheckboxGroup
        label="Interested Courses"
        options={INTERESTED_COURSE_OPTIONS}
        value={interestedCourses}
        onChange={(value) => setInterestedCourses(value as InterestedCourseSlug[])}
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
