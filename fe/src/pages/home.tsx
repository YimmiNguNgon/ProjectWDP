import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function HomePage() {
  const banners = [
    {
      id: "1",
      title: "Flash Sale Mega",
      description: "Giảm giá lên đến 70% cho các sản phẩm được chọn",
      badge: "HOT DEAL",
      bgColor: "bg-red-500",
      textColor: "text-white",
      buttonText: "Mua Ngay",
      buttonAction: () => console.log("Flash sale clicked"),
      icon: "🛍️",
    },
    {
      id: "2",
      title: "Miễn Phí Vận Chuyển",
      description: "Vận chuyển miễn phí cho đơn hàng từ 100.000 VNĐ trở lên",
      badge: "VẬN CHUYỂN",
      bgColor: "bg-blue-500",
      textColor: "text-white",
      buttonText: "Xem Chi Tiết",
      buttonAction: () => console.log("Free shipping clicked"),
      icon: "🚚",
    },
    {
      id: "3",
      title: "Sản Phẩm Mới",
      description: "Khám phá bộ sưu tập mới nhất từ các nhà bán hàng hàng đầu",
      badge: "MỚI NHẤT",
      bgColor: "bg-purple-500",
      textColor: "text-white",
      buttonText: "Khám Phá",
      buttonAction: () => console.log("New products clicked"),
      icon: "⭐",
    },
    {
      id: "4",
      title: "Chương Trình Khuyến Mãi",
      description: "Nhận phiếu giảm giá và hoàn tiền khi mua sắm hôm nay",
      badge: "VOUCHER",
      bgColor: "bg-green-500",
      textColor: "text-white",
      buttonText: "Nhận Voucher",
      buttonAction: () => console.log("Voucher clicked"),
      icon: "🎁",
    },
    {
      id: "5",
      title: "Hàng Chính Hãng",
      description: "Cam kết 100% hàng chính hãng hoặc hoàn tiền 200%",
      badge: "BẢO ĐẢM",
      bgColor: "bg-orange-500",
      textColor: "text-white",
      buttonText: "Tìm Hiểu",
      buttonAction: () => console.log("Authentic products clicked"),
      icon: "🏆",
    },
  ];

  return (
    <div className="flex flex-col gap-12">
      <Carousel className="relative">
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
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

      <CategoryShowcase title="Trending on eBay" />
    </div>
  );
}
