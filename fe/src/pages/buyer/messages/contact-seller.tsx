import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import api from '@/lib/axios';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ProductDetail } from './product-detail';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Messages } from '@/components/chat/messages';
import { useAuth } from '@/hooks/use-auth';
import { useMessage } from '@/hooks/use-message';

export default function ContactSellerPage() {
  const { productId } = useParams();
  const [product, setProduct] = React.useState<ProductDetail>();
  const [open, setOpen] = React.useState(false);
  const { payload } = useAuth();
  const { setParticipants, setProductRef } = useMessage();

  React.useEffect(() => {
    api.get(`/api/v1/products/${productId}`).then((res) => {
      setProduct(res.data?.data);
    });
  }, [productId]);

  const handleJoinChat = () => {
    const sender = payload?.userId;
    const receiver = product?.sellerId;
    if (!sender || !receiver) return;
    setParticipants([sender, receiver]);
    setProductRef(productId);
  };

  return (
    <>
      <div className='flex flex-col gap-4'>
        <Item variant={'outline'}>
          <ItemMedia>
            <img
              src={product?.imageUrl}
              alt={product?.title}
              className='w-18 h-18 aspect-square'
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <Link to={`/products/${product?._id}`}>{product?.title}</Link>
            </ItemTitle>
            <ItemDescription>${product?.price}</ItemDescription>
          </ItemContent>
        </Item>
        <Accordion type='multiple'>
          <AccordionItem value='Details about the item'>
            <AccordionTrigger className='text-lg font-medium'>
              Details about the item
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value='Postage'>
            <AccordionTrigger className='text-lg font-medium'>
              Postage
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value='Combined Postage'>
            <AccordionTrigger className='text-lg font-medium'>
              Combined Postage
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value='Returns'>
            <AccordionTrigger className='text-lg font-medium'>
              Returns
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value='Others'>
            <AccordionTrigger className='text-lg font-medium'>
              Others
            </AccordionTrigger>
            <AccordionContent>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit
                odio consequatur molestias repudiandae optio voluptatibus unde.
                Veniam blanditiis et exercitationem? Velit obcaecati iusto
                dolorem aspernatur itaque minus consequuntur? Vero,
                perspiciatis?
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className='fixed bottom-0 left-0 w-full bg-primary text-primary-foreground border-t h-16 flex items-center justify-center gap-4'>
        <span>Still have questions?</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant={'secondary'}
              size={'sm'}
              onClick={() => handleJoinChat()}
            >
              Contact Seller
            </Button>
          </DialogTrigger>
          <DialogContent
            className='h-fit overflow-auto flex flex-col p-0 gap-0 left-[unset] right-0 top-[unset] bottom-0 translate-0 m-4'
            aria-describedby=''
            showCloseButton={false}
          >
            <DialogTitle hidden>Chat box</DialogTitle>
            <Messages onCloseDialog={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
