import { getStreamers, getMedia } from "@/lib/data";
import CreatorPage from "./page-content";
import { Suspense } from "react";

function PageSkeleton() {
    return <div>Loading...</div>
}

export default async function CreatorLayout() {
    // Fetch any initial data needed for the creator dashboard here
    const [allStreamers, allMedia] = await Promise.all([
        getStreamers(),
        getMedia()
    ]);
    
    return (
        <Suspense fallback={<PageSkeleton/>}>
            <CreatorPage allStreamers={allStreamers} allMedia={allMedia}/>
        </Suspense>
    );
}
