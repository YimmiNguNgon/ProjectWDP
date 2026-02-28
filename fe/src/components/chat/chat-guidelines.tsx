import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ChatGuidelines() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="px-4 pb-2">
      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <AlertTitle className="text-sm font-semibold text-blue-900">eBay Messaging Guidelines</AlertTitle>
            {isExpanded && (
              <AlertDescription className="mt-2 text-sm text-blue-800">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Allowed:</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-xs">
                      <li>Questions about products (size, condition, color)</li>
                      <li>Shipping and delivery discussions</li>
                      <li>Product photos and invoices</li>
                      <li>eBay links</li>
                      <li>Return and complaint requests</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Not allowed:</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-xs">
                      <li>Phone numbers (any format)</li>
                      <li>Social links (Facebook, Zalo, Instagram, etc.)</li>
                      <li>Email addresses</li>
                      <li>Requests for off-platform transactions</li>
                      <li>External payment links</li>
                    </ul>
                  </div>

                  <p className="text-xs italic text-blue-700 mt-2">Policy violations may lead to account restrictions.</p>
                </div>
              </AlertDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Button>
        </div>
      </Alert>
    </div>
  );
}
