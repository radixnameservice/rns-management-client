/**
 * ===========================================
 * REGISTRAR MANAGEMENT UI ENHANCEMENTS
 * ===========================================
 * 
 * These functions need to be added to main.js to support the enhanced
 * registrar management UI with statistics and per-resource fee tracking.
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Add these helper functions near the top of main.js (after other helper functions)
 * 2. Modify loadRegistrarInfo() function to populate stats section
 * 3. Remove the 100 domains requirement from withdrawal logic
 */

// ============================================================================
// HELPER FUNCTIONS FOR STATS FORMATTING
// Add these functions to main.js (around line 400, near other helper functions)
// ============================================================================

/**
 * Calculate total domains bonded across all resources
 */
function calculateTotalDomains(domainsBonded) {
  if (!Array.isArray(domainsBonded)) return 0;
  
  let total = 0;
  for (const entry of domainsBonded) {
    total += parseInt(entry.value) || 0;
  }
  return total;
}

/**
 * Calculate total fees earned across all resources
 */
function calculateTotalFees(feesEarned) {
  if (!Array.isArray(feesEarned)) return '0';
  
  // Return count of resources with fees since amounts are in different tokens
  const count = feesEarned.filter(e => parseFloat(e.value) > 0).length;
  return `${count} resource${count !== 1 ? 's' : ''}`;
}

/**
 * Format domains bonded per resource for display
 */
function formatDomainsPerResource(domainsBonded) {
  if (!Array.isArray(domainsBonded) || domainsBonded.length === 0) {
    return '<p class="info-empty" style="margin: 0;">No domains bonded yet</p>';
  }
  
  let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
  for (const entry of domainsBonded) {
    const resourceAddress = entry.key;
    const count = entry.value;
    const shortAddress = `${resourceAddress.slice(0, 18)}...${resourceAddress.slice(-10)}`;
    
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 4px;">
        <span style="font-family: 'Courier New', monospace; font-size: 0.85em;" title="${resourceAddress}">${shortAddress}</span>
        <span style="font-weight: bold; color: #3498db;">${count}</span>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

/**
 * Format fees earned per resource for display
 */
function formatFeesPerResource(feesEarned) {
  if (!Array.isArray(feesEarned) || feesEarned.length === 0) {
    return '<p class="info-empty" style="margin: 0;">No fees earned yet</p>';
  }
  
  let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
  for (const entry of feesEarned) {
    const resourceAddress = entry.key;
    const amount = entry.value;
    const shortAddress = `${resourceAddress.slice(0, 18)}...${resourceAddress.slice(-10)}`;
    const hasAmount = parseFloat(amount) > 0;
    
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 4px;">
        <span style="font-family: 'Courier New', monospace; font-size: 0.85em;" title="${resourceAddress}">${shortAddress}</span>
        <span style="font-weight: bold; color: ${hasAmount ? '#2ecc71' : '#888'};">${amount}</span>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

/**
 * Get a user-friendly short name for a resource (for dropdowns/display)
 */
function getResourceShortName(resourceAddress) {
  if (!resourceAddress) return 'Unknown';
  // You can add a mapping of known resources to friendly names here
  return `${resourceAddress.slice(0, 15)}...${resourceAddress.slice(-8)}`;
}

// ============================================================================
// MODIFICATIONS TO EXISTING loadRegistrarInfo() FUNCTION
// Find this function around line 3395 and apply these changes:
// ============================================================================

/**
 * CHANGE 1: After line 3522 (elements.registrarInfoContent.innerHTML = infoHTML;)
 * ADD THIS CODE to populate the stats section:
 */

/*
    // Display performance statistics (NEW)
    if (registrarStats) {
      let statsHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div style="padding: 16px; background: rgba(52, 152, 219, 0.1); border-radius: 8px; border-left: 3px solid #3498db;">
            <div style="font-size: 0.85em; color: #888; margin-bottom: 4px;">📈 Total Domains Bonded</div>
            <div style="font-size: 1.5em; font-weight: bold; color: #3498db;">${calculateTotalDomains(registrarStats.domains_bonded)}</div>
          </div>
          <div style="padding: 16px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border-left: 3px solid #2ecc71;">
            <div style="font-size: 0.85em; color: #888; margin-bottom: 4px;">💰 Total Fees Earned</div>
            <div style="font-size: 1.5em; font-weight: bold; color: #2ecc71;">${calculateTotalFees(registrarStats.fees_earned)}</div>
          </div>
        </div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 4px;">
          <div style="font-weight: 500; margin-bottom: 8px;">Domains Bonded per Resource:</div>
          ${formatDomainsPerResource(registrarStats.domains_bonded)}
        </div>
        <div style="margin-top: 8px; padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 4px;">
          <div style="font-weight: 500; margin-bottom: 8px;">Fees Earned per Resource:</div>
          ${formatFeesPerResource(registrarStats.fees_earned)}
        </div>
      `;
      
      const statsContent = document.getElementById('registrarStatsContent');
      if (statsContent) {
        statsContent.innerHTML = statsHTML;
      }
    } else {
      const statsContent = document.getElementById('registrarStatsContent');
      if (statsContent) {
        statsContent.innerHTML = '<p class="info-empty">No statistics available yet</p>';
      }
    }
*/

/**
 * CHANGE 2: Around line 3550, REPLACE the withdrawal logic
 * Find these lines:
 *   const canWithdraw = domainsCount >= 100;
 *   const progressText = `${domainsCount}/100 domains bonded`;
 * 
 * REPLACE WITH:
 *   const hasFeesToWithdraw = parseFloat(amount) > 0;
 *   const statusText = `${domainsCount} domains bonded`;
 */

/**
 * CHANGE 3: Around line 3554-3576, REPLACE the fee display HTML
 * Update the if/else blocks to remove 100 domains requirement:
 */

/*
          // V2 allows withdrawal anytime (no minimum domains required)
          const hasFeesToWithdraw = parseFloat(amount) > 0;
          const statusText = `${domainsCount} domains bonded`;
          
          if (hasFeesToWithdraw) {
            feesHTML += `
              <div class="info-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #2ecc71; border-radius: 4px; margin-bottom: 8px; background: rgba(46, 204, 113, 0.05);">
                <div style="flex: 1;">
                  <div style="font-weight: bold; margin-bottom: 4px;">Amount: ${amount}</div>
                  <div class="address-value" style="font-size: 0.85em; color: #888; margin-bottom: 4px;">${resourceAddress}</div>
                  <div style="font-size: 0.85em; color: #2ecc71;">✅ ${statusText} - Ready to withdraw</div>
                </div>
                <button class="btn btn-success" onclick="window.withdrawSpecificFee('${resourceAddress}')">Withdraw</button>
              </div>
            `;
          } else {
            feesHTML += `
              <div class="info-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #666; border-radius: 4px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.02);">
                <div style="flex: 1;">
                  <div style="font-weight: bold; margin-bottom: 4px;">Amount: ${amount}</div>
                  <div class="address-value" style="font-size: 0.85em; color: #888; margin-bottom: 4px;">${resourceAddress}</div>
                  <div style="font-size: 0.85em; color: #888;">ℹ️ ${statusText} - No fees yet</div>
                </div>
                <button class="btn btn-secondary" disabled style="opacity: 0.5; cursor: not-allowed;">No Fees</button>
              </div>
            `;
          }
*/

// ============================================================================
// SUMMARY OF CHANGES
// ============================================================================
/*
 * 1. Added 5 helper functions for formatting stats data
 * 2. Modified loadRegistrarInfo() to populate stats section
 * 3. Removed 100 domains requirement (v2 doesn't have this)
 * 4. Updated withdrawal UI to show "Ready to withdraw" for any amount > 0
 * 
 * KEY IMPROVEMENTS:
 * - Stats section shows total domains & fees at a glance
 * - Detailed per-resource breakdown for both domains and fees
 * - Withdrawal available anytime fees > 0 (no minimum domains)
 * - Better UX with clear status messages
 */


