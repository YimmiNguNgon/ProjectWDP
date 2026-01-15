import { type ComponentProps } from 'react';
import { ItemGroup, Item, ItemContent } from './ui/item';
import { Skeleton } from './ui/skeleton';

export type LoadingProps = ComponentProps<'div'> & {
  contents?: number;
  items?: number;
};

export function LoadingItems({
  contents = 3,
  items = 3,
  ...props
}: LoadingProps) {
  const mockItems = Array(items).fill(null);
  const mockContents = Array(contents).fill(null);

  return (
    <ItemGroup className='gap-4'>
      {mockItems.map((_, index) => {
        return (
          <Item key={index} variant={'outline'} {...props}>
            <ItemContent>
              {mockContents.map((_, index) => (
                <Skeleton className='w-full h-4 my-1' key={index} />
              ))}
            </ItemContent>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
