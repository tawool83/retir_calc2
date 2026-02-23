const defaultEvents = [
  {
    id: 'evt_1',
    age: 30,
    type: 'lump',
    amount: 5000000,
    label: '초기 투자금'
  },
  {
    id: 'evt_2',
    age: 30,
    type: 'monthly',
    amount: 1500000,
    label: '월 분할 투자금'
  },
  {
    id: 'evt_3',
    age: 30,
    type: 'portfolio',
    presetId: 'sp500',
    weight: 10
  },
   {
    id: 'evt_4',
    age: 50,
    type: 'portfolio',
    presetId: 'schd',
    weight: 10
  },
  {
    id: 'evt_5',
    age: 50,
    type: 'monthly',
    amount: 0, // 은퇴 후 납입 중단
    label: '월 투자 중지'
  },
  {
    id: 'evt_6',
    age: 55,
    type: 'withdrawal',
    amount: 6000000,
    label: '매월 생활비'
  },
  {
    id: 'evt_7',
    age: 60,
    type: 'income',
    amount: 1000000,
    label: '국민연금'
  }
];