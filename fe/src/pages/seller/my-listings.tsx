import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  PackageIcon,
  MoreVerticalIcon,
  EditIcon,
  PauseIcon,
  PlayIcon,
  StopCircleIcon,
  TrashIcon,
  SearchIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import {
  getMyListings,
  updateListingStatus,
  deleteProduct,
  type Product,
} from '@/api/seller-products';
import { toast } from 'sonner';
import EditProductDialog from '@/components/seller/edit-product-dialog';
import RequestOutletDialog from '@/components/seller/request-outlet-dialog';
import RequestDailyDealDialog from '@/components/seller/request-deal-dialog';

export default function MyListingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [outletRequestProduct, setOutletRequestProduct] = useState<Product | null>(null);
  const [dealRequestProduct, setDealRequestProduct] = useState<Product | null>(null);


  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await getMyListings(params);
      const data = Array.isArray(res?.data) ? res.data : [];
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load listings', err);
      toast.error('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const handleSearch = () => {
    fetchProducts();
  };

  const handleStatusChange = async (
    productId: string,
    newStatus: 'active' | 'paused' | 'ended'
  ) => {
    try {
      await updateListingStatus(productId, newStatus);
      toast.success(`Listing status updated to ${newStatus}`);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update listing status');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      await deleteProduct(productId);
      toast.success('Listing deleted successfully');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete listing');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-200' },
      paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      ended: { label: 'Ended', className: 'bg-gray-100 text-gray-800 border-gray-200' },
      deleted: { label: 'Deleted', className: 'bg-red-100 text-red-800 border-red-200' },
    };

    const config = statusConfig[status] || { label: status, className: '' };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <PackageIcon className="w-6 h-6 text-primary" />
              My Listings
              <Badge variant="secondary" className="ml-2">
                {products.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-3">
              <Link to="/seller/inventory">
                <Button variant="outline">
                  <AlertTriangleIcon className="w-4 h-4 mr-2" />
                  Inventory
                </Button>
              </Link>
              <Link to="/seller/sold">
                <Button variant="outline">Sold Items</Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Listings</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <Button onClick={handleSearch} size="icon">
                <SearchIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {products.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <PackageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <EmptyTitle className="text-xl">No listings found</EmptyTitle>
                <EmptyDescription className="text-base">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first listing to get started'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold text-right">Price</TableHead>
                    <TableHead className="font-semibold text-right">Quantity</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image || product.images?.[0] || '/placeholder.png'}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded border"
                          />
                          <div>
                            <div className="font-medium">{product.title}</div>
                            <div className="text-sm text-gray-500">
                              {product.categoryId?.name || 'Uncategorized'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${product.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            product.quantity === 0
                              ? 'text-red-600 font-medium'
                              : product.quantity < product.lowStockThreshold
                                ? 'text-yellow-600 font-medium'
                                : ''
                          }
                        >
                          {product.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(product.listingStatus)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(product.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVerticalIcon className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                              <EditIcon className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {product.listingStatus === 'active' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(product._id, 'paused')}
                              >
                                <PauseIcon className="w-4 h-4 mr-2" />
                                Pause Listing
                              </DropdownMenuItem>
                            )}
                            {product.listingStatus === 'paused' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(product._id, 'active')}
                              >
                                <PlayIcon className="w-4 h-4 mr-2" />
                                Resume Listing
                              </DropdownMenuItem>
                            )}
                            {product.listingStatus !== 'ended' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(product._id, 'ended')}
                              >
                                <StopCircleIcon className="w-4 h-4 mr-2" />
                                End Listing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setOutletRequestProduct(product)}
                            >
                              Request Brand Outlet
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDealRequestProduct(product)}
                            >
                              Request Daily Deal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(product._id)}
                              className="text-red-600"
                            >
                              <TrashIcon className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}

      {/* Request Outlet Dialog */}
      {outletRequestProduct && (
        <RequestOutletDialog
          product={outletRequestProduct}
          open={!!outletRequestProduct}
          onClose={() => setOutletRequestProduct(null)}
          onSuccess={() => {
            setOutletRequestProduct(null);
            toast.success('Outlet request submitted! Check Promotion Requests page');
          }}
        />
      )}

      {/* Request Daily Deal Dialog */}
      {dealRequestProduct && (
        <RequestDailyDealDialog
          product={dealRequestProduct}
          open={!!dealRequestProduct}
          onClose={() => setDealRequestProduct(null)}
          onSuccess={() => {
            setDealRequestProduct(null);
            toast.success('Daily Deal request submitted! Check Promotion Requests page');
          }}
        />
      )}
    </div>
  );
}
