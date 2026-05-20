package sample;

import javafx.animation.KeyFrame;
import javafx.animation.KeyValue;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.geometry.VPos;
import javafx.scene.Scene;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.util.Duration;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.UnknownHostException;

public class SocketClient {

    private BufferedReader in;
    private PrintWriter out;

    public void connect(String hostName, int portNumber, ConnectionFXController topLevel) {

        System.out.println("Starting client'");

        try {
            Socket kkSocket = new Socket(hostName, portNumber);
            out = new PrintWriter(kkSocket.getOutputStream(), true);
            in = new BufferedReader(
                    new InputStreamReader(kkSocket.getInputStream()));

            String inputLine;

            while ((inputLine = in.readLine()) != null) {

                final String toPass = inputLine;
                // Avoid throwing IllegalStateException by running from a non-JavaFX thread.
                Platform.runLater(
                        () -> {
                            topLevel.printText(toPass);
                        }
                );
            }


        } catch (UnknownHostException e) {
            System.err.println("Don't know about host " + hostName);
            System.exit(1);
        } catch (IOException e) {
            System.err.println("Couldn't get I/O for the connection to " +
                    hostName);
            System.exit(1);
        }
    }

    public void send(String send) {
        out.println(send);
    }
}
