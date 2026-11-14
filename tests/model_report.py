"""Run model tests once and save their results to tests/results/*.md."""
import sys
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import test_embedding
import test_qwen
import test_whisper

RESULTS_DIR = Path(__file__).parent / 'results'


class ReportResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.outcomes = []

    def record(self, test, status):
        self.outcomes.append((str(test), status, list(getattr(test, 'report_lines', []))))

    def addSuccess(self, test):
        super().addSuccess(test)
        self.record(test, 'OK')

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.record(test, 'FAIL: ' + self._exc_info_to_string(err, test))

    def addError(self, test, err):
        super().addError(test, err)
        self.record(test, 'ERROR: ' + self._exc_info_to_string(err, test))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.record(test, 'SKIPPED: ' + reason)

    def addSubTest(self, test, subtest, err):
        super().addSubTest(test, subtest, err)
        if err is not None:
            self.record(subtest, 'FAIL: ' + self._exc_info_to_string(err, test))


def run_and_report(name, module):
    suite = unittest.defaultTestLoader.loadTestsFromModule(module)
    started = time.perf_counter()
    result = unittest.TextTestRunner(resultclass=ReportResult, verbosity=2).run(suite)
    lines = [f'# {name}', '', f'Тестов: {result.testsRun}; ошибок: '
             f'{len(result.failures) + len(result.errors)}; пропущено: {len(result.skipped)}; '
             f'время: {time.perf_counter() - started:.1f} с', '']
    for test, status, details in result.outcomes:
        lines += [f'## {test}', '', f'Результат: {status}', '', *details, '']
    if module is test_embedding:
        for title, example in module.LIVE_EXAMPLES:
            lines += [f'## {title}', '', *example, '']
    path = RESULTS_DIR / f'{name.lower()}.md'
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Отчёт: {path}')
    return result.wasSuccessful()


def main():
    RESULTS_DIR.mkdir(exist_ok=True)
    results = [run_and_report(name, module) for name, module in (
        ('Qwen', test_qwen), ('Whisper', test_whisper), ('Embedding', test_embedding))]
    return 0 if all(results) else 1


if __name__ == '__main__':
    sys.exit(main())
