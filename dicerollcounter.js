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
		this.deviations = {};
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
		this.updateDeviations();
	}

	/*========================================================================*/
	uncountRoll(number) {
		this.rollCounts[number]--;
		this.total--;
		this.updateExpectedAverage();
		this.updateDeviations();
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
	greatestDeviationRollCount() {
		let greatestDeviation = 0;

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			const deviation = this.deviations[roll];

			if (greatestDeviation < deviation)
				greatestDeviation = deviation;
		}

		return greatestDeviation;
	}

	/*========================================================================*/
	rollsMatchingDeviation(matchDeviation)
	{
		let matchingRolls = [];

		if (this.total <= 0) return [];

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			const deviation = this.deviations[roll];

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

		// Recalculate everything from the loaded roll counts.
		this.updateTotalFromRollCounts();
		this.updateExpectedAverage();
		this.updateDeviations();
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

	/*========================================================================*/
	updateDeviations() {
		for (let roll = minRoll; roll <= maxRoll; roll++) {
			let count = this.rollCounts[roll];
			if (count === undefined) count = 0;

			this.deviations[roll] = Math.abs(count - this.expectedAverage);
		}
	}
}

/******************************************************************************/

class Histogram {
	constructor() {
		this.canvas = null;
		this.context = null;
		this.redStripePattern = null;
	}

	/*========================================================================*/
	init() {
		this.canvas = document.getElementById("histogram");
		this.context = this.canvas.getContext("2d");

		this.canvas.height = this.canvas.width * 0.5;

		this.createRedStripePattern();
	}

	/*========================================================================*/
	draw() {
		if (this.canvas === null) {
			this.init();
		}

		const canvasWidth = this.canvas.width;
		const canvasHeight = this.canvas.height;

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

		this.context.clearRect(0, 0, canvasWidth, canvasHeight);

		// Expected Average Range
		if (maxCount > 0) {
			const averageTop
				= barBottom - (maxBarHeight * expectedAverageHigh / maxCount);
			const averageBottom
				= barBottom - (maxBarHeight * expectedAverageLow / maxCount);

			this.context.fillStyle = "grey";
			this.context.fillRect
				( 0
				, averageTop
				, canvasWidth
				, averageBottom - averageTop
				);
		}

		// Greatest Deviations
		{
			this.context.fillStyle = this.redStripePattern;

			const greatestDeviation = counter.greatestDeviationRollCount();

			const greatestDeviationRolls
				= counter.rollsMatchingDeviation(greatestDeviation);

			for (const roll of greatestDeviationRolls) {
				let count = counter.rollCounts[roll];

				if (count === undefined) count = 0;

				if (count >= expectedAverageLow && count <= expectedAverageHigh) {
					continue;
				}

				const barLeft = (roll - 1) * barSpacing;

				this.context.fillRect(barLeft, 0, barSpacing, barBottom);
			}
		}

		this.context.textAlign = "center";
		this.context.textBaseline = "bottom";
		this.context.font = fontHeight + "px sans-serif";
		this.context.fillStyle = "black";

		for (let roll = minRoll; roll <= maxRoll; roll++) {
			const barLeft = (roll - 1) * barSpacing;

			this.context.fillText(roll, barLeft + barSpacing / 2, canvasHeight);

			const count = counter.rollCounts[roll];

			if (maxCount > 0) {
				const barHeight = maxBarHeight * count / maxCount;

				this.context.fillRect
					( barLeft + barPadding
					, barBottom - barHeight
					, barWidth
					, barHeight
					);
			}
		}
	}

	/*========================================================================*/
	createRedStripePattern() {
		const patternCanvas = document.createElement("canvas");
		patternCanvas.width = 32;
		patternCanvas.height = 32;

		const patternContext = patternCanvas.getContext("2d");
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

		this.redStripePattern
			= this.context.createPattern(patternCanvas, "repeat");
	}
}

/******************************************************************************/

let counter = new RollCounter;
let histogram = new Histogram;

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
	histogram.draw();
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
