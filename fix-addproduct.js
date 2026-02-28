const fs = require('fs');

// Files to fix with their specific replacements
const files = [
  {
    path: 'C:/Users/Administrator/Documents/WDP/fe/src/pages/seller/AddProduct.tsx',
    replacements: [
      ['vÃ ', 'và'],
      ['ÄÆ°á»£c', 'được'],
      ['thÃ nh', 'thành'],
      ['CÃ³', 'Có'],
      ['Táº¡o', 'Tạo'],
      ['cá»­a hÃ ng', 'cửa hàng'],
      ['KÃ©o tháº£ hÃ¬nh áº£nh vÃ o ÄÃ¢y hoáº·c click Äá»ƒ chá»n', 'Kéo thả hình ảnh vào đây hoặc click để chọn'],
      ['Nháº­p', 'Nhập'],
      ['vá»', 'về'],
    ]
  }
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf8');
  let original = content;
  
  for (const [bad, good] of file.replacements) {
    const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, good);
  }
  
  if (content !== original) {
    fs.writeFileSync(file.path, content, 'utf8');
    console.log(`Fixed: ${file.path}`);
  } else {
    console.log(`No changes: ${file.path}`);
  }
}

console.log('Done!');
