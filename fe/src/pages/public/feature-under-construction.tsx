
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FeatureUnderConstructionPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="max-w-md w-full text-center shadow-lg border-2 border-dashed">
        <CardHeader>
          <div className="mx-auto bg-muted/50 p-4 rounded-full mb-4 w-fit">
            <Construction className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Feature Under Development</CardTitle>
          <CardDescription className="text-lg">
            We're working hard to bring this feature to you soon!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This page is currently under construction. Please check back later for updates.
          </p>
          <Button 
            onClick={() => navigate(-1)} 
            className="w-full gap-2"
            variant="default"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
