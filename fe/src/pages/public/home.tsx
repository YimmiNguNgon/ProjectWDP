import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { CategoryShowcase } from "@/components/category-showcase";
import { Banner } from "@/components/banner";
import { SaleTimeShowcase } from "@/components/sale-time-showcase";
import { ThreeDMarqueeSection } from "@/components/three-d-marquee-section";
import { RecentlyViewedSection } from "@/components/recently-viewed";

export default function HomePage() {
  const banners = [
    {
      id: "1",
      title: "Flash Sale Mega",
      description: "Up to 70% off selected products",
      badge: "HOT DEAL",
      bgColor: "bg-red-500",
      textColor: "text-white",
      buttonText: "Shop Now",
      buttonAction: () => console.log("Flash sale clicked"),
      icon: "🛍️",
    },
    {
      id: "2",
      title: "Free Shipping",
      description: "Free shipping for orders above 100,000 VND",
      badge: "SHIPPING",
      bgColor: "bg-blue-500",
      textColor: "text-white",
      buttonText: "View Details",
      buttonAction: () => console.log("Free shipping clicked"),
      icon: "🚚",
    },
    {
      id: "3",
      title: "New Arrivals",
      description: "Explore the latest collection from top sellers",
      badge: "NEW",
      bgColor: "bg-purple-500",
      textColor: "text-white",
      buttonText: "Explore",
      buttonAction: () => console.log("New products clicked"),
      icon: "⭐",
    },
    {
      id: "4",
      title: "Voucher Program",
      description: "Get discount vouchers and cashback for today's orders",
      badge: "VOUCHER",
      bgColor: "bg-green-500",
      textColor: "text-white",
      buttonText: "Get Voucher",
      buttonAction: () => console.log("Voucher clicked"),
      icon: "🎁",
    },
    {
      id: "5",
      title: "Authentic Products",
      description: "100% authentic guarantee or 200% money back",
      badge: "GUARANTEE",
      bgColor: "bg-orange-500",
      textColor: "text-white",
      buttonText: "Learn More",
      buttonAction: () => console.log("Authentic products clicked"),
      icon: "🏆",
    },
  ];

  return (
    <div className="flex flex-col gap-12">
      {/* Banner + 3D Marquee side by side */}
      <div className="flex gap-4 items-stretch">
        {/* Banner carousel - nửa trái */}
        <div className="w-1/2 relative">
          <Carousel className="relative h-full">
            <CarouselContent className="h-full">
              {banners.map((banner) => (
                <CarouselItem key={banner.id} className="h-full">
                  <Banner {...banner} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="absolute right-4 bottom-4 flex gap-2">
              <CarouselPrevious
                size={"icon-lg"}
                className="static translate-0 cursor-pointer"
              />
              <CarouselNext
                size={"icon-lg"}
                className="static translate-0 cursor-pointer"
              />
            </div>
          </Carousel>
        </div>

        {/* 3D Marquee - nửa phải */}
        <div className="w-1/2 rounded-2xl overflow-hidden">
          <ThreeDMarqueeSection />
        </div>
      </div>

      <Item variant={"muted"} className="border border-border p-8 bg-[#AAED56]">
        <ItemContent>
          <ItemTitle className="text-2xl font-bold text-[#324E0F]">
            Shopping made easy
          </ItemTitle>
          <ItemDescription className="text-md font-medium mt-2">
            Enjoy reliability, secure deliveries and hassle-free returns.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            size={"lg"}
            className="bg-[#324E0F] cursor-pointer hover:bg-[#345110] text-[#AAED56] text-lg"
            asChild
          >
            <p>Start Now</p>
          </Button>
        </ItemActions>
      </Item>

      <SaleTimeShowcase />

      <RecentlyViewedSection displayLimit={10} showClearAll />

      <CategoryShowcase title="Trending on eBay" />
    </div>
  );
}
