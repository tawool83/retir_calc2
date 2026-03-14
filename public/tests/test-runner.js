
const testState = {
    tests: [],
    successes: 0,
    failures: 0,
    errors: []
};

function test(name, fn) {
    testState.tests.push({ name, fn });
}

function runTests() {
    console.log("🚀 Starting tests...");
    testState.successes = 0;
    testState.failures = 0;
    testState.errors = [];

    for (const t of testState.tests) {
        try {
            t.fn();
            console.log(`✅ [PASS] ${t.name}`);
            testState.successes++;
        } catch (e) {
            console.error(`❌ [FAIL] ${t.name}`);
            console.error(e);
            testState.failures++;
            testState.errors.push({ name: t.name, error: e.message });
        }
    }

    console.log("--------------------");
    console.log(`🏁 Tests finished. Success: ${testState.successes}, Failures: ${testState.failures}`);

    // Display results in the HTML
    const resultsElement = document.getElementById('test-results');
    if (resultsElement) {
        let html = `<h2>Test Results: ${testState.successes} Passed, ${testState.failures} Failed</h2>`;
        if (testState.failures > 0) {
            html += '<ul>';
            testState.errors.forEach(err => {
                html += `<li><strong>❌ ${err.name}</strong>: ${err.error}</li>`;
            });
            html += '</ul>';
        }
        resultsElement.innerHTML = html;
    }
}

const assert = {
    equal(actual, expected, message = `Expected ${expected}, but got ${actual}`) {
        if (actual !== expected) {
            throw new Error(message);
        }
    },
    isTrue(value, message = `Expected true, but got ${value}`) {
        if (value !== true) {
            throw new Error(message);
        }
    },
    isFalse(value, message = `Expected false, but got ${value}`) {
        if (value !== false) {
            throw new Error(message);
        }
    },
    deepEqual(obj1, obj2, message = 'Objects are not deeply equal') {
        if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
            console.log("Expected:", obj1);
            console.log("Actual:", obj2);
            throw new Error(message);
        }
    }
};
