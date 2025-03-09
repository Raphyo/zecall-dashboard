type UserMapping = {
  [email: string]: string;
};

export const USER_ID_MAPPING: UserMapping = {
  'rvannerom@zecall.ai': '0c90ba08-3624-4e15-8558-1bda894f8e65',
  'raphaelvannerom@gmail.com': '4128b151-e801-4396-a42f-d7c170b9b158',
  'team.zecall@gmail.com': '4f911edd-f4ea-435d-ad81-35f436d8e19b',
  'sachalellouche@gmail.com': '5bbe0db8-0cd5-4dcf-9e4e-8f849bf4d3be',
  'slellouche@zecall.ai': 'ba8d1b9f-a14c-4792-8835-06c6bd7f3aa4',
  'mohamed93420@hotmail.com': '3083164f-32ac-4fba-beae-2087bfc7c7ee',
  'contact@ilcaffeditalia.fr': '4c819f6f-e60e-4211-b32d-1e40ce552dcc',
  'david.diouf@hotmail.fr': 'f8c61a37-45c5-4ebb-a85f-6751f5b8933e',
  'actionenergetique@gmail.com': '1f7447cb-dc00-45e5-bbf0-e686f8f672f1',
  'julien.volkmann@gmail.com': '4b33fa43-83ca-436b-829e-32ed6d7afc90'
};

export function getUserIdFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return USER_ID_MAPPING[email] || null;
} 