import { getStreamers } from "@/lib/data";
import AdminPage from "./page-content";

export default async function AdminLayout() {
    const allStreamers = await getStreamers();
    return <AdminPage allStreamers={allStreamers} />;
}
