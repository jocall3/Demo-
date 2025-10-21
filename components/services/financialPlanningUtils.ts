export function calculateFutureValue(
    presentValue: number,
    annualInterestRate: number,
    numberOfPeriods: number
): number {
    const ratePerPeriod = annualInterestRate / 100;
    return presentValue * Math.pow(1 + ratePerPeriod, numberOfPeriods);
}

export function calculateFutureValueAnnuity(
    paymentPerPeriod: number,
    annualInterestRate: number,
    numberOfPeriods: number,
    isAnnuityDue: boolean = false // false for ordinary annuity (end of period), true for annuity due (beginning of period)
): number {
    const ratePerPeriod = annualInterestRate / 100;

    if (ratePerPeriod === 0) {
        return paymentPerPeriod * numberOfPeriods;
    }

    const futureValueOrdinaryAnnuity = paymentPerPeriod * ((Math.pow(1 + ratePerPeriod, numberOfPeriods) - 1) / ratePerPeriod);
    
    return isAnnuityDue 
        ? futureValueOrdinaryAnnuity * (1 + ratePerPeriod)
        : futureValueOrdinaryAnnuity;
}

export function calculateSimpleInterest(
    principal: number,
    annualInterestRate: number,
    timeInYears: number
): number {
    const rateAsDecimal = annualInterestRate / 100;
    return principal * rateAsDecimal * timeInYears;
}

export function calculateCompoundInterest(
    principal: number,
    annualInterestRate: number,
    compoundingFrequency: number, // e.g., 1 for annually, 4 for quarterly, 12 for monthly
    timeInYears: number
): number {
    const rateAsDecimal = annualInterestRate / 100;
    const totalPeriods = compoundingFrequency * timeInYears;
    return principal * Math.pow(1 + (rateAsDecimal / compoundingFrequency), totalPeriods);
}

export function calculateLoanPayment(
    principal: number,
    annualInterestRate: number,
    loanTermMonths: number
): number {
    const monthlyInterestRate = (annualInterestRate / 100) / 12;

    if (monthlyInterestRate === 0) {
        return principal / loanTermMonths;
    }

    const numerator = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths);
    const denominator = Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1;
    
    return numerator / denominator;
}

export interface AmortizationPeriod {
    period: number;
    startingBalance: number;
    payment: number;
    interestPaid: number;
    principalPaid: number;
    endingBalance: number;
}

export function generateAmortizationSchedule(
    principal: number,
    annualInterestRate: number,
    loanTermMonths: number
): AmortizationPeriod[] {
    const monthlyPayment = calculateLoanPayment(principal, annualInterestRate, loanTermMonths);
    const monthlyInterestRate = (annualInterestRate / 100) / 12;
    
    const schedule: AmortizationPeriod[] = [];
    let remainingBalance = principal;

    for (let i = 1; i <= loanTermMonths; i++) {
        const interestPaid = remainingBalance * monthlyInterestRate;
        let principalPaid = monthlyPayment - interestPaid;

        // Adjust last payment to clear any tiny remaining balance due to floating point arithmetic
        if (i === loanTermMonths) {
            principalPaid = remainingBalance;
        } else if (remainingBalance < principalPaid) {
            // This can happen if monthly payment calculation was slightly off or principal is very small
            principalPaid = remainingBalance;
        }

        const endingBalance = Math.max(0, remainingBalance - principalPaid);

        schedule.push({
            period: i,
            startingBalance: remainingBalance,
            payment: monthlyPayment,
            interestPaid: interestPaid,
            principalPaid: principalPaid,
            endingBalance: endingBalance,
        });

        remainingBalance = endingBalance;
        if (remainingBalance <= 0.01 && i < loanTermMonths) { // Handle cases where balance is paid off early
            break;
        }
    }
    return schedule;
}