import { getStreamers, getEvents } from "@/lib/data";
import { getFirebaseAuthUsers } from "../actions/manage-streamers";
import AdminPage from "./page-content";

export default async function AdminLayout() {
    const [allStreamers, allEvents, authUsers] = await Promise.all([
        getStreamers(),
        getEvents(),
        getFirebaseAuthUsers()
    ]);
    
    return <AdminPage allStreamers={allStreamers} allEvents={allEvents} authUsers={authUsers} />;
}
