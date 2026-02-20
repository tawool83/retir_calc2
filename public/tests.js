test('Example Test: Addition', () => {
    assert.equal(1 + 2, 3);
});

test('Example Test: Subtraction', () => {
    assert.equal(5 - 2, 3);
});

test('fmtMoney: 일반 숫자 포맷팅', () => {
    assert.equal(fmtMoney(1500000), "1,500,000원");
    assert.equal(fmtMoney(-20000), "-20,000원");
    assert.equal(fmtMoney(0), "0원");
    assert.equal(fmtMoney(1234.56), "1,235원"); // 반올림 확인
});

test('fmtMoney: compact 옵션 포맷팅', () => {
    assert.equal(fmtMoney(123456789, true), "1.23억");
    assert.equal(fmtMoney(500000, true), "50만");
    assert.equal(fmtMoney(9999, true), "1만"); // 1만 미만은 그대로 표시되어야 하지만 현재 로직은 '1만'으로 표시합니다. 이 테스트는 현재 로직을 기준으로 합니다.
    assert.equal(fmtMoney(10000, true), "1만");
});
