// Khách (hình tạm): tên và màu áo/tóc. Nhân vật là thiết kế riêng của Jamie's Milk Tea.
export interface CustomerLook {
  shirt: string;
  hair: string;
  skin: string;
}

export const CUSTOMER_NAMES = [
  'Bé Na', 'Minh Khang', 'Thảo Vy', 'Gia Bảo', 'Ngọc Mai',
  'Tuấn Anh', 'Bích Ngân', 'Phúc An', 'Khánh Linh', 'Hải Đăng',
];

export const CUSTOMER_LOOKS: CustomerLook[] = [
  { shirt: '#8FB8E8', hair: '#5A3B2A', skin: '#F6D7BF' },
  { shirt: '#F5A3B7', hair: '#2F2A2A', skin: '#F3D0B5' },
  { shirt: '#A7D08C', hair: '#7A4B2E', skin: '#F7DCC6' },
  { shirt: '#F5C65B', hair: '#3E2C23', skin: '#EFC7A6' },
  { shirt: '#C7A4E0', hair: '#6B3F2A', skin: '#F6D7BF' },
  { shirt: '#F0937A', hair: '#2C2420', skin: '#F2CDB0' },
];
