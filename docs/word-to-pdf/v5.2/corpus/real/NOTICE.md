# Real-world corpus (third-party)

These three documents are genuine Microsoft Word files taken from the
[docx4j](https://github.com/plutext/docx4j) sample corpus, which is published under
the Apache License 2.0. They are included unmodified, solely as conversion inputs
for regression tests.

| File               | Source path in docx4j                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `sample-docx.docx` | `docx4j-samples-docx4j/sample-docs/sample-docx.docx`                    |
| `invoice2013.docx` | `docx4j-samples-docx4j/sample-docs/databinding/invoice2013.docx`        |
| `textbox.docx`     | `docx4j-samples-docx4j/sample-docs/2010/DrawingML_GraphicData_wps.docx` |

No output generated from them is redistributed outside `docs/`; the PDFs produced by
the tests are written to `test-results/` (not committed).
