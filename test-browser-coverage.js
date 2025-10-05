/**
 * Browser-based coverage collection using Puppeteer
 * Captures coverage for client-side JavaScript
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function collectBrowserCoverage() {
  console.log('🌐 Starting browser coverage collection...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Enable JavaScript coverage
    await page.coverage.startJSCoverage({
      resetOnNavigation: false,
      reportAnonymousScripts: true
    });

    console.log('📡 Navigating to http://localhost:3000...');
    
    // Navigate to the app
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting for app initialization...');
    await page.waitForTimeout(5000);

    // Interact with the app to trigger code execution
    console.log('🖱️  Simulating user interactions...');
    
    // Click around, trigger events
    await page.evaluate(() => {
      // Trigger any global functions if they exist
      if (window.startSimulation) window.startSimulation();
      if (window.pauseSimulation) window.pauseSimulation();
    });

    await page.waitForTimeout(3000);

    // Collect coverage
    console.log('📊 Collecting coverage data...');
    const jsCoverage = await page.coverage.stopJSCoverage();

    // Process coverage data
    const coverageDir = path.join(__dirname, 'coverage', 'browser');
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }

    // Filter and save coverage for our files only
    const filteredCoverage = jsCoverage.filter(entry => {
      const url = entry.url;
      return !url.includes('node_modules') && 
             !url.includes('chrome-extension') &&
             (url.includes('MyHavokSimCode') || url.includes('assets'));
    });

    // Calculate coverage statistics
    let totalBytes = 0;
    let usedBytes = 0;

    const coverageReport = filteredCoverage.map(entry => {
      const url = entry.url;
      const ranges = entry.ranges;
      
      let fileUsedBytes = 0;
      ranges.forEach(range => {
        fileUsedBytes += range.end - range.start;
      });

      totalBytes += entry.text.length;
      usedBytes += fileUsedBytes;

      const coverage = entry.text.length > 0 
        ? (fileUsedBytes / entry.text.length) * 100 
        : 0;

      return {
        url,
        totalBytes: entry.text.length,
        usedBytes: fileUsedBytes,
        unusedBytes: entry.text.length - fileUsedBytes,
        coverage: Math.round(coverage * 10) / 10
      };
    });

    // Sort by unused bytes (most unused first)
    coverageReport.sort((a, b) => b.unusedBytes - a.unusedBytes);

    // Save detailed report
    const reportPath = path.join(coverageDir, 'coverage-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(coverageReport, null, 2));

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 BROWSER COVERAGE SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    const overallCoverage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
    console.log(`Overall Coverage: ${overallCoverage.toFixed(1)}%`);
    console.log(`Total Bytes: ${totalBytes.toLocaleString()}`);
    console.log(`Used Bytes: ${usedBytes.toLocaleString()}`);
    console.log(`Unused Bytes: ${(totalBytes - usedBytes).toLocaleString()}\n`);

    if (coverageReport.length > 0) {
      console.log('📁 FILES WITH MOST UNUSED CODE:\n');
      coverageReport.slice(0, 10).forEach((file, index) => {
        const fileName = file.url.split('/').pop() || file.url;
        console.log(`${index + 1}. ${fileName}`);
        console.log(`   Coverage: ${file.coverage}%`);
        console.log(`   Unused: ${file.unusedBytes.toLocaleString()} bytes\n`);
      });
    }

    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    console.log('💡 TIP: Use Chrome DevTools Coverage tab for line-by-line analysis');
    console.log('   1. Open Chrome DevTools (F12)');
    console.log('   2. Press Ctrl+Shift+P and type "coverage"');
    console.log('   3. Click "Start instrumenting coverage and reload page"\n');

  } catch (error) {
    console.error('❌ Coverage collection failed:', error.message);
    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.error('\n⚠️  Make sure the server is running on http://localhost:3000');
      console.error('   Run: npm start\n');
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if server is running
const http = require('http');
http.get('http://localhost:3000', () => {
  collectBrowserCoverage();
}).on('error', () => {
  console.error('❌ Server is not running on http://localhost:3000');
  console.error('   Please start the server first: npm start\n');
  process.exit(1);
});
