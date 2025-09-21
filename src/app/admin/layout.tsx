import { getStreamers, getEvents, getMedia } from "@/lib/data";
import { getFirebaseAuthUsers } from "../actions/manage-streamers";
import AdminPage from "./page-content";

export default function AdminLayout() {
    // The data fetching is now client-side in page-content.tsx to ensure fresh data for form selects.
    return <AdminPage />;
}
