import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className='flex flex-col gap-12'>
      <Carousel className='relative'>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <Card className='bg-muted'>
                <CardContent className='flex items-center justify-center h-68'>
                  <span className='text-4xl font-semibold'>{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className='absolute right-4 bottom-4 flex gap-2'>
          <CarouselPrevious size={'icon-lg'} className='static translate-0' />
          <CarouselNext size={'icon-lg'} className='static translate-0' />
        </div>
      </Carousel>

      <Item variant={'muted'} className='border border-border p-8'>
        <ItemContent>
          <ItemTitle className='text-2xl'>Shopping made easy</ItemTitle>
          <ItemDescription className='text-md font-medium'>
            Enjoy reliability, secure deliveries and hassle-free returns.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size={'lg'} className='bg-black hover:bg-neutral-800' asChild>
            <Link to={'#'}>Start Now</Link>
          </Button>
        </ItemActions>
      </Item>

      <section className='flex flex-col gap-4'>
        <h1 className='text-2xl font-bold'>Trending on eBay</h1>
        <div className='flex gap-4'>
          {Array.from({ length: 5 }).map((_, index) => (
            <Link to={'#'} key={index} className='w-full'>
              <div className='aspect-square bg-muted rounded-full flex items-center justify-center'>
                <span className='text-4xl'>{index + 1}</span>
              </div>
              <figcaption className='text-muted-foreground pt-2 text-sm text-center mt-2'>
                Category No.{index + 1}
              </figcaption>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
