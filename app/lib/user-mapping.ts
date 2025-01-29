type UserMapping = {
  [email: string]: string;
};

export const USER_ID_MAPPING: UserMapping = {
  'rvannerom@zecall.ai': '0c90ba08-3624-4e15-8558-1bda894f8e65',
  'raphaelvannerom@gmail.com': '4128b151-e801-4396-a42f-d7c170b9b158',
  'team.zecall@gmail.com': '4f911edd-f4ea-435d-ad81-35f436d8e19b',
  'sachalellouche@gmail.com': '5bbe0db8-0cd5-4dcf-9e4e-8f849bf4d3be',
  'slellouche@zecall.ai': 'ba8d1b9f-a14c-4792-8835-06c6bd7f3aa4',
  'dcambon.spi@gmail.com': 'e99df9f9-cb29-4a50-afe2-c0d3dbead1c1'
};

export function getUserIdFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return USER_ID_MAPPING[email] || null;
} 