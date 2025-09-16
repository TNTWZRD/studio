import { getStreamers, getEvents } from "@/lib/data";
import AdminPage from "./page-content";

export default async function AdminLayout() {
    const [allStreamers, allEvents] = await Promise.all([
        getStreamers(),
        getEvents()
    ]);
    
    return <AdminPage allStreamers={allStreamers} allEvents={allEvents} />;
}

    