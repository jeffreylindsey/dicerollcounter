"use strict";

const minRoll = 1;
const maxRoll = 20;

let rollCounts = {};
let rollHistory = [];
const rollHistoryMaxLength = 10;

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
	rollCounts = {};
	rollHistory = [];
	onRollCountsChanged();
	onRollHistoryChanged();
}

/*============================================================================*/
function countRoll(number) {
	if (rollCounts[number] === undefined) {
		rollCounts[number] = 1;
	} else {
		rollCounts[number]++;
	}

	onRollCountsChanged();
}

/*============================================================================*/
function uncountRoll(number) {
	rollCounts[number]--;

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
	//console.log(rollCounts);

	localStorage.setItem("rollCounts", JSON.stringify(rollCounts));

	drawHistogram();

	const expectedAverage = expectedAverageRollCount();

	document.getElementById("total-count").innerHTML = totalRollCount();
	document.getElementById("expected-average").innerHTML = expectedAverage;

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
function totalRollCount() {
	let total = 0;

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		let count = rollCounts[roll];

		if (count === undefined) continue;

		total += count;
	}

	return total;
}

/*============================================================================*/
function maxRollCount() {
	let max = 0;

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		let count = rollCounts[roll];

		if (count === undefined) continue;

		if (max < count)
			max = count;
	}

	return max;
}

/*============================================================================*/
function greatestDeviationRollCount(expectedAverage) {
	let greatestDeviation = 0;

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		let count = rollCounts[roll];

		if (count === undefined) continue;

		const deviation = Math.abs(count - expectedAverage);

		if (greatestDeviation < deviation)
			greatestDeviation = deviation;
	}

	return greatestDeviation;
}

/*============================================================================*/
function rollsMatchingDeviation(expectedAverage, matchDeviation)
{
	let matchingRolls = [];

	const count = totalRollCount();

	if (count <= 0) return [];

	const matchEpsilon = 1 / count;

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		let count = rollCounts[roll];

		if (count === undefined) count = 0;

		const deviation = Math.abs(count - expectedAverage);

		if (deviation == matchDeviation)
			matchingRolls.push(roll);
	}

	return matchingRolls;
}

/*============================================================================*/
function expectedAverageRollCount() {
	const numFaces = maxRoll - minRoll + 1;

	return totalRollCount() / numFaces;
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

	const maxCount = maxRollCount();
	const expectedAverage = expectedAverageRollCount();
	const expectedAverageHigh = Math.ceil(expectedAverage) + 0.5;
	const expectedAverageLow = Math.max(0, Math.floor(expectedAverage) - 0.5);

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

		const greatestDeviation = greatestDeviationRollCount(expectedAverage);
		const greatestDeviationRolls
			= rollsMatchingDeviation(expectedAverage, greatestDeviation);

		for (const roll of greatestDeviationRolls) {
			let count = rollCounts[roll];

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

		const count = rollCounts[roll];

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

	dataTable.innerHTML = "";

	const headerRow = document.createElement("tr");
	{
		const cell = document.createElement("th");
		cell.innerHTML = "Roll";
		headerRow.appendChild(cell);
	}
	{
		const cell = document.createElement("th");
		cell.innerHTML = "Count";
		headerRow.appendChild(cell);
	}
	{
		const cell = document.createElement("th");
		cell.innerHTML = "Deviation";
		headerRow.appendChild(cell);
	}
	dataTable.appendChild(headerRow);

	const expectedAverage = expectedAverageRollCount();

	for (let roll = minRoll; roll <= maxRoll; roll++) {
		let count = rollCounts[roll];

		if (count === undefined) count = 0;

		const row = document.createElement("tr");
		{
			const cell = document.createElement("td");
			cell.innerHTML = roll;
			row.appendChild(cell);
		}
		{
			const cell = document.createElement("td");
			cell.innerHTML = count;
			row.appendChild(cell);
		}
		{
			const deviation = count - expectedAverage;

			const cell = document.createElement("td");
			cell.innerHTML = deviation.toFixed(2);
			row.appendChild(cell);
		}
		dataTable.appendChild(row);
	}
}

/*============================================================================*/
function loadFromLocalStorage() {
	const storedRollCounts = localStorage.getItem("rollCounts");
	const storedRollHistory = localStorage.getItem("rollHistory");

	if (storedRollCounts) rollCounts = JSON.parse(storedRollCounts);
	if (storedRollHistory) rollHistory = JSON.parse(storedRollHistory);
}

/*============================================================================*/
