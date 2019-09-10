"use strict";

const minRoll = 1;
const maxRoll = 20;
const numFaces = maxRoll - minRoll + 1;

let rollHistory = [];
const rollHistoryMaxLength = 10;

/******************************************************************************/

class RollCounter {
	constructor() {
		this.rollCounts = {};
		this.total = 0;
		this.expectedAverage = 0;
	}

	/*========================================================================*/
	countRoll(number) {
		if (this.rollCounts[number] === undefined) {
			this.rollCounts[number] = 1;
		} else {
			this.rollCounts[number]++;
		}

		this.total++;
		this.updateExpectedAverage();
	}

	/*========================================================================*/
	uncountRoll(number) {
		this.rollCounts[number]--;
		this.total--;
		this.updateExpectedAverage();
	}

	/*========================================================================*/
	maxRollCount() {
		let max = 0;

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			let count = this.rollCounts[roll];

			if (count === undefined) continue;

			if (max < count)
				max = count;
		}

		return max;
	}

	/*========================================================================*/
	greatestDeviationRollCount(expectedAverage) {
		let greatestDeviation = 0;

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			let count = this.rollCounts[roll];

			if (count === undefined) continue;

			const deviation = Math.abs(count - expectedAverage);

			if (greatestDeviation < deviation)
				greatestDeviation = deviation;
		}

		return greatestDeviation;
	}

	/*========================================================================*/
	rollsMatchingDeviation(expectedAverage, matchDeviation)
	{
		let matchingRolls = [];

		if (this.total <= 0) return [];

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			let count = this.rollCounts[roll];

			if (count === undefined) count = 0;

			const deviation = Math.abs(count - expectedAverage);

			if (deviation == matchDeviation)
				matchingRolls.push(roll);
		}

		return matchingRolls;
	}

	/*========================================================================*/
	saveToLocalStorage() {
		localStorage.setItem("rollCounts", JSON.stringify(this.rollCounts));
	}

	/*========================================================================*/
	loadFromLocalStorage() {
		const storedRollCounts = localStorage.getItem("rollCounts");
		if (storedRollCounts) this.rollCounts = JSON.parse(storedRollCounts);

		// The total needs to be recalculated, because the roll counts have
		// changed.
		this.updateTotalFromRollCounts();
		this.updateExpectedAverage();
	}

	/*========================================================================*/
	updateTotalFromRollCounts() {
		this.total = 0;

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			let count = this.rollCounts[roll];

			if (count !== undefined) this.total += count;
		}
	}

	/*========================================================================*/
	updateExpectedAverage() {
		this.expectedAverage = this.total / numFaces;
	}
}

/******************************************************************************/

let counter = new RollCounter;

/*============================================================================*/
function onLoad() {
	loadFromLocalStorage();
	onRollCountsChanged();
	onRollHistoryChanged();
}

/*============================================================================*/
function onDiceRoll(number) {
	if (number === undefined) return;
	if (number < minRoll) return;
	if (number > maxRoll) return;

	countRoll(number);
	addRollToHistory(number);
}

/*============================================================================*/
function onUndo() {
	if (rollHistory.length == 0) return;

	let lastNumber = rollHistory.pop();
	uncountRoll(lastNumber);

	onRollHistoryChanged();
}

/*============================================================================*/
function onReset() {
	counter = new RollCounter;
	rollHistory = [];
	onRollCountsChanged();
	onRollHistoryChanged();
}

/*============================================================================*/
function countRoll(number) {
	counter.countRoll(number);
	onRollCountsChanged();
}

/*============================================================================*/
function uncountRoll(number) {
	counter.uncountRoll(number);
	onRollCountsChanged();
}

/*============================================================================*/
function addRollToHistory(number) {
	if (rollHistory.length >= rollHistoryMaxLength) {
		rollHistory.shift();
	}

	rollHistory.push(number);

	onRollHistoryChanged();
}

/*============================================================================*/
function onRollCountsChanged() {
	counter.saveToLocalStorage();

	drawHistogram();

	document.getElementById("total-count").textContent = counter.total;
	document.getElementById("expected-average").textContent
		= counter.expectedAverage;

	fillDataTable();
}

/*============================================================================*/
function onRollHistoryChanged() {
	console.log(rollHistory);

	localStorage.setItem("rollHistory", JSON.stringify(rollHistory));

	// Dispaly the history in reverse order, so that the most recent roll is on
	// the left.
	if (rollHistory.length == 0) {
		document.getElementById("roll-history").value = "";
	} else {
		document.getElementById("roll-history").value = rollHistory.reduceRight(
			(previousValue, currentValue) => previousValue += ", " + currentValue
		);
	}
}

/*============================================================================*/
function drawHistogram() {
	let canvas = document.getElementById("histogram");
	let context = canvas.getContext("2d");

	canvas.height = canvas.width * 0.5;

	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;

	const barSpacing = canvasWidth / 20;
	const barWidth = barSpacing * 0.65;
	const barPadding = (barSpacing - barWidth) / 2;
	const fontHeight = barWidth * 0.75;
	const labelHeight = fontHeight + barPadding;
	const barBottom = canvasHeight - labelHeight;
	const maxBarHeight = canvasHeight - labelHeight - barPadding;

	const maxCount = counter.maxRollCount();
	const expectedAverageHigh = Math.ceil(counter.expectedAverage) + 0.5;
	const expectedAverageLow
		= Math.max(0, Math.floor(counter.expectedAverage) - 0.5);

	context.clearRect(0, 0, canvasWidth, canvasHeight);

	// Expected Average Range
	if (maxCount > 0) {
		const averageTop
			= barBottom - (maxBarHeight * expectedAverageHigh / maxCount);
		const averageBottom
			= barBottom - (maxBarHeight * expectedAverageLow / maxCount);

		context.fillStyle = "grey";
		context.fillRect(0, averageTop, canvasWidth, averageBottom - averageTop);
	}

	// Greatest Deviations
	{
		const patternCanvas = document.createElement("canvas");
		const patternContext = patternCanvas.getContext("2d");
		patternCanvas.width = 32;
		patternCanvas.height = 32;
		patternContext.fillStyle = "red";
		patternContext.beginPath();
		patternContext.moveTo(0, 16);
		patternContext.lineTo(16, 0);
		patternContext.lineTo(32, 0);
		patternContext.lineTo(0, 32);
		patternContext.closePath();
		patternContext.fill();
		patternContext.beginPath();
		patternContext.moveTo(16, 32);
		patternContext.lineTo(32, 16);
		patternContext.lineTo(32, 32);
		patternContext.closePath();
		patternContext.fill();

		const pattern = context.createPattern(patternCanvas, "repeat");
		context.fillStyle = pattern;

		const greatestDeviation
			= counter.greatestDeviationRollCount(counter.expectedAverage);

		const greatestDeviationRolls
			= counter.rollsMatchingDeviation
				( counter.expectedAverage
				, greatestDeviation
				);

		for (const roll of greatestDeviationRolls) {
			let count = counter.rollCounts[roll];

			if (count === undefined) count = 0;

			if (count >= expectedAverageLow && count <= expectedAverageHigh) {
				continue;
			}

			const barLeft = (roll - 1) * barSpacing;

			context.fillRect(barLeft, 0, barSpacing, barBottom);
		}
	}

	context.textAlign = "center";
	context.textBaseline = "bottom";
	context.font = fontHeight + "px sans-serif";
	context.fillStyle = "black";

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		const barLeft = (roll - 1) * barSpacing;

		context.fillText(roll, barLeft + barSpacing / 2, canvasHeight);

		const count = counter.rollCounts[roll];

		if (maxCount > 0) {
			const barHeight = maxBarHeight * count / maxCount;

			context.fillRect
				( barLeft + barPadding
				, barBottom - barHeight
				, barWidth
				, barHeight
				);
		}
	}
}

/*============================================================================*/
function fillDataTable() {
	const dataTable = document.getElementById("data-table");

	dataTable.textContent = "";

	const headerRow = document.createElement("tr");
	{
		const cell = document.createElement("th");
		cell.textContent = "Roll";
		headerRow.appendChild(cell);
	}
	{
		const cell = document.createElement("th");
		cell.textContent = "Count";
		headerRow.appendChild(cell);
	}
	{
		const cell = document.createElement("th");
		cell.textContent = "Deviation";
		headerRow.appendChild(cell);
	}
	dataTable.appendChild(headerRow);

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		let count = counter.rollCounts[roll];

		if (count === undefined) count = 0;

		const row = document.createElement("tr");
		{
			const cell = document.createElement("td");
			cell.textContent = roll;
			row.appendChild(cell);
		}
		{
			const cell = document.createElement("td");
			cell.textContent = count;
			row.appendChild(cell);
		}
		{
			const deviation = count - counter.expectedAverage;

			const cell = document.createElement("td");
			cell.textContent = deviation.toFixed(2);
			row.appendChild(cell);
		}
		dataTable.appendChild(row);
	}
}

/*============================================================================*/
function loadFromLocalStorage() {
	counter.loadFromLocalStorage();

	const storedRollHistory = localStorage.getItem("rollHistory");
	if (storedRollHistory) rollHistory = JSON.parse(storedRollHistory);
}

/*============================================================================*/
