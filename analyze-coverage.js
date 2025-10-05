/**
 * Coverage Analysis Tool
 * Analyzes code coverage data to identify unused code and optimization opportunities
 */

const fs = require("fs");
const path = require("path");

class CoverageAnalyzer {
  constructor() {
    this.coverageFile = path.join(__dirname, "coverage", "coverage-final.json");
    this.threshold = {
      unused: 0, // 0% coverage = completely unused
      lowUsage: 30, // < 30% coverage = rarely used
      moderate: 60, // < 60% coverage = moderate usage
    };
  }

  async analyze() {
    console.log("🔍 Analyzing Code Coverage...\n");

    if (!fs.existsSync(this.coverageFile)) {
      console.error(
        '❌ Coverage file not found. Run "npm run test:coverage" first.'
      );
      process.exit(1);
    }

    const coverageData = JSON.parse(fs.readFileSync(this.coverageFile, "utf8"));

    const analysis = {
      unused: [],
      lowUsage: [],
      moderate: [],
      wellCovered: [],
      summary: {
        totalFiles: 0,
        unusedFiles: 0,
        lowUsageFiles: 0,
        totalLines: 0,
        coveredLines: 0,
        unusedFunctions: 0,
        totalFunctions: 0,
      },
    };

    for (const [filePath, data] of Object.entries(coverageData)) {
      const relativePath = path.relative(__dirname, filePath);
      const fileAnalysis = this.analyzeFile(relativePath, data);

      analysis.summary.totalFiles++;
      analysis.summary.totalLines += fileAnalysis.totalLines;
      analysis.summary.coveredLines += fileAnalysis.coveredLines;
      analysis.summary.totalFunctions += fileAnalysis.totalFunctions;
      analysis.summary.unusedFunctions += fileAnalysis.unusedFunctions;

      if (fileAnalysis.coverage === 0) {
        analysis.unused.push(fileAnalysis);
        analysis.summary.unusedFiles++;
      } else if (fileAnalysis.coverage < this.threshold.lowUsage) {
        analysis.lowUsage.push(fileAnalysis);
        analysis.summary.lowUsageFiles++;
      } else if (fileAnalysis.coverage < this.threshold.moderate) {
        analysis.moderate.push(fileAnalysis);
      } else {
        analysis.wellCovered.push(fileAnalysis);
      }
    }

    this.printReport(analysis);
    this.generateRecommendations(analysis);
    this.saveReport(analysis);
  }

  analyzeFile(filePath, data) {
    const statements = data.s || {};
    const functions = data.f || {};
    const branches = data.b || {};

    const totalStatements = Object.keys(statements).length;
    const coveredStatements = Object.values(statements).filter(
      (count) => count > 0
    ).length;

    const totalFunctions = Object.keys(functions).length;
    const coveredFunctions = Object.values(functions).filter(
      (count) => count > 0
    ).length;
    const unusedFunctions = totalFunctions - coveredFunctions;

    const totalBranches = Object.values(branches).flat().length;
    const coveredBranches = Object.values(branches)
      .flat()
      .filter((count) => count > 0).length;

    const totalLines = totalStatements;
    const coveredLines = coveredStatements;
    const coverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;

    // Find unused function names
    const unusedFunctionNames = [];
    const fnMap = data.fnMap || {};
    Object.keys(functions).forEach((key) => {
      if (functions[key] === 0) {
        const fnInfo = fnMap[key];
        if (fnInfo && fnInfo.name) {
          unusedFunctionNames.push(fnInfo.name);
        }
      }
    });

    return {
      path: filePath,
      coverage: Math.round(coverage * 10) / 10,
      totalLines,
      coveredLines,
      uncoveredLines: totalLines - coveredLines,
      totalFunctions,
      coveredFunctions,
      unusedFunctions,
      unusedFunctionNames,
      totalBranches,
      coveredBranches,
      branchCoverage:
        totalBranches > 0
          ? Math.round((coveredBranches / totalBranches) * 100 * 10) / 10
          : 0,
    };
  }

  printReport(analysis) {
    console.log("═══════════════════════════════════════════════════════");
    console.log("📊 CODE COVERAGE ANALYSIS REPORT");
    console.log("═══════════════════════════════════════════════════════\n");

    // Summary
    const overallCoverage =
      analysis.summary.totalLines > 0
        ? (analysis.summary.coveredLines / analysis.summary.totalLines) * 100
        : 0;

    console.log("📈 OVERALL SUMMARY:");
    console.log(`   Total Files: ${analysis.summary.totalFiles}`);
    console.log(`   Overall Coverage: ${overallCoverage.toFixed(1)}%`);
    console.log(`   Total Lines: ${analysis.summary.totalLines}`);
    console.log(`   Covered Lines: ${analysis.summary.coveredLines}`);
    console.log(
      `   Uncovered Lines: ${
        analysis.summary.totalLines - analysis.summary.coveredLines
      }`
    );
    console.log(`   Total Functions: ${analysis.summary.totalFunctions}`);
    console.log(`   Unused Functions: ${analysis.summary.unusedFunctions}\n`);

    // Unused files
    if (analysis.unused.length > 0) {
      console.log("🚨 COMPLETELY UNUSED FILES (0% coverage):");
      analysis.unused.forEach((file) => {
        console.log(`   ❌ ${file.path}`);
        console.log(
          `      Lines: ${file.totalLines} | Functions: ${file.totalFunctions}`
        );
      });
      console.log("");
    }

    // Low usage files
    if (analysis.lowUsage.length > 0) {
      console.log(
        `⚠️  LOW USAGE FILES (<${this.threshold.lowUsage}% coverage):`
      );
      analysis.lowUsage.slice(0, 10).forEach((file) => {
        console.log(`   📉 ${file.path} - ${file.coverage}%`);
        console.log(
          `      Uncovered: ${file.uncoveredLines}/${file.totalLines} lines`
        );
        if (file.unusedFunctionNames.length > 0) {
          console.log(
            `      Unused functions: ${file.unusedFunctionNames
              .slice(0, 3)
              .join(", ")}${file.unusedFunctionNames.length > 3 ? "..." : ""}`
          );
        }
      });
      if (analysis.lowUsage.length > 10) {
        console.log(`   ... and ${analysis.lowUsage.length - 10} more files`);
      }
      console.log("");
    }

    // Moderate usage
    if (analysis.moderate.length > 0) {
      console.log(
        `📊 MODERATE USAGE FILES (${this.threshold.lowUsage}-${this.threshold.moderate}% coverage):`
      );
      console.log(
        `   ${analysis.moderate.length} files with room for improvement\n`
      );
    }

    // Well covered
    console.log(
      `✅ WELL COVERED FILES (>${this.threshold.moderate}% coverage):`
    );
    console.log(`   ${analysis.wellCovered.length} files with good coverage\n`);
  }

  generateRecommendations(analysis) {
    console.log("═══════════════════════════════════════════════════════");
    console.log("💡 OPTIMIZATION RECOMMENDATIONS");
    console.log("═══════════════════════════════════════════════════════\n");

    if (analysis.unused.length > 0) {
      console.log("1️⃣  REMOVE UNUSED FILES:");
      console.log(
        "   Consider removing or archiving these completely unused files:"
      );
      analysis.unused.forEach((file) => {
        console.log(`   - ${file.path}`);
      });
      console.log("");
    }

    if (analysis.summary.unusedFunctions > 0) {
      console.log("2️⃣  REMOVE UNUSED FUNCTIONS:");
      console.log(
        `   Found ${analysis.summary.unusedFunctions} unused functions across the codebase.`
      );
      console.log("   Review low-usage files for dead code removal.\n");
    }

    if (analysis.lowUsage.length > 0) {
      console.log("3️⃣  REFACTOR LOW-USAGE CODE:");
      console.log(
        "   These files have low coverage and may contain dead code:"
      );
      analysis.lowUsage.slice(0, 5).forEach((file) => {
        console.log(`   - ${file.path} (${file.coverage}% coverage)`);
      });
      console.log("");
    }

    console.log("4️⃣  NEXT STEPS:");
    console.log("   • Review unused files and remove if not needed");
    console.log("   • Add tests for critical uncovered code paths");
    console.log("   • Remove dead code and unused functions");
    console.log("   • Run coverage regularly to track improvements");
    console.log(
      "   • Open coverage/index.html for detailed line-by-line analysis\n"
    );
  }

  saveReport(analysis) {
    const reportPath = path.join(__dirname, "coverage", "analysis-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  }
}

// Run analysis
const analyzer = new CoverageAnalyzer();
analyzer.analyze().catch((error) => {
  console.error("❌ Analysis failed:", error);
  process.exit(1);
});
