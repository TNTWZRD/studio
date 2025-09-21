import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function AboutSection() {
    return (
        <section id="about" className="py-16 sm:py-24 bg-secondary">
            <div className="container mx-auto">
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold tracking-tight text-center sm:text-4xl font-headline">
                            Who We Are
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-lg text-muted-foreground">
                        <p>
                            Team AMW (Americas Most Wanted) is a collective of passionate gamers, creators, and competitors dedicated to fostering a positive and engaging community. We started as a small group of friends and have grown into a hub for everything gaming-related. Whether you're looking to find teammates, watch entertaining streams, or compete in events, you've come to the right place.
                        </p>
                        <p>
                            Our members stream a variety of games, host community nights, and participate in tournaments. We believe in sportsmanship, mutual respect, and the shared joy of gaming.
                        </p>
                        <div className="text-center pt-4">
                           <Button asChild variant="outline">
                               <Link href="#">
                                   <FileText className="mr-2"/> Our Full Charter
                               </Link>
                           </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
