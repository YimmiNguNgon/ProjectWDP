import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from 'lucide-react';
import { Badge } from './ui/badge';

export default function ComplaintBadge({ status }: { status: string }) {
  switch (status) {
    case 'open':
      return (
        <Badge
          variant='outline'
          className='text-gray-600 border-gray-200 bg-gray-50'
        >
          <ClockIcon className='w-3 h-3' />
          Pending
        </Badge>
      );
    case 'agreed':
      return (
        <Badge
          variant='outline'
          className='text-green-600 border-green-200 bg-green-50'
        >
          <CheckCircleIcon className='w-3 h-3' />
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant='outline'
          className='text-red-600 border-red-200 bg-red-50'
        >
          <ClockIcon className='w-3 h-3' />
          Rejected
        </Badge>
      );
    case 'sent_to_admin':
      return (
        <Badge
          variant='outline'
          className='text-orange-600 border-orange-200 bg-orange-50'
        >
          <XCircleIcon className='w-3 h-3' />
          Admin Review
        </Badge>
      );
    default:
      return (
        <Badge
          variant='outline'
          className='text-gray-600 border-gray-200 bg-gray-50'
        >
          <AlertCircleIcon className='w-3 h-3' />
          {status}
        </Badge>
      );
  }
}
