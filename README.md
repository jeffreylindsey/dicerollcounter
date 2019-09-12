# Dice Roll Counter

Dice Roll Counter is a simple webpage designed to assist with checking the fairness of a 20-sided die (D20).

This page can be found live at: [jeffreylindsey.com/misc/dicerollcounter/](http://jeffreylindsey.com/misc/dicerollcounter/)

## Usage

Push the buttons for each roll of the die, and the tallies of each result will be displayed in a bar graph.  The expected average, based on the number of rolls, is displayed as a horizontal grey bar.  The roll (or rolls) with the greatest deviation from the expected average is highlighted.

An **Undo** button with a short history of prior rolls is provided to recover from accidental or experimental button presses.

The tallies and history are stored in local browser storage, so that the data is not lost if the page is refreshed or the browser is closed and re-opened.  A reset button is provided to clear all existing data.

## About

This was designed for use on a mobile device.

The functionality is driven by JavaScript, and the graph is done using an HTML canvas.

There are no external dependencies.
